import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateDailyTotals } from "@/lib/nutrition-calculator";
import type { FoodLogEntry } from "@/types/nutrition-tracking";
import type {
  AssistantChatMessage,
  MinimalNutritionContext,
  NutritionAssistantResponse,
} from "@/types/assistant";

export const PRIMARY_MODEL = "gemini-2.5-flash-lite";
export const FALLBACK_MODEL = "gemini-flash-lite-latest";
export const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const ROUTE_TOTAL_BUDGET_MS = 11000; // 11.0s end-to-end route execution budget (comfortably inside 15s ceiling)
export const ROUTE_RESPONSE_BUFFER_MS = 800; // 800ms reserved for HTTP serialization & network flush
export const AUTH_TIMEOUT_CEILING_MS = 3000; // 3.0s ceiling on SSR authentication check
export const DB_TIMEOUT_CEILING_MS = 3000;   // 3.0s ceiling on Supabase context retrieval

export const GEMINI_TOTAL_BUDGET_MS = 8500; // 8.5s total Gemini execution budget
export const GEMINI_MIN_REMAINING_FOR_CALL_MS = 2000; // 2.0s floor required to attempt a model call
export const GEMINI_RETRY_DELAY_MS = 1000; // 1.0s transient backoff for 429 / 503

export const MANDATORY_MEDICAL_DISCLAIMER =
  "LocalFit AI Nutrition Assistant provides dietary and culinary information for general educational purposes only. It is not medical advice, clinical diagnosis, or treatment. Always consult a qualified physician or clinical dietitian for personal medical concerns.";

export const EMERGENCY_ADVICE_TEXT =
  "⚠️ **POTENTIAL MEDICAL EMERGENCY DETECTED**\n\n" +
  "The symptoms you described may indicate an acute, life-threatening medical emergency. " +
  "Please contact your local emergency services immediately (such as **112** in India/Europe, **911** in the US/Canada, or **999** in the UK) " +
  "or proceed to the nearest emergency department without delay.\n\n" +
  "*Important Notice: This automated application cannot provide emergency medical triage, diagnosis, or treatment, and does not detect every medical emergency.*";

// ----------------------------------------------------------------------------
// Rate Limiter: In-Memory Sliding Window
// ----------------------------------------------------------------------------
// NOTE ON PRODUCTION ARCHITECTURE:
// This rate limiter is strictly process-local (in-memory within the active Node.js server instance).
// In a distributed, multi-instance production environment (e.g. serverless functions or container clusters),
// requests from the same user may hit separate processes. A shared persistent store such as Redis
// (e.g. Upstash Redis) or database token bucket is required for globally coordinated quota enforcement.
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const assistantRateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 20;

export function checkAssistantRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = assistantRateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    assistantRateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export function resetAssistantRateLimit(identifier?: string): void {
  if (identifier) {
    assistantRateLimitMap.delete(identifier);
  } else {
    assistantRateLimitMap.clear();
  }
}

// ----------------------------------------------------------------------------
// Date & Timezone Validation
// ----------------------------------------------------------------------------
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export function getValidatedTimezone(tz?: string | null): string {
  if (!tz || typeof tz !== "string") return "UTC";
  const trimmed = tz.trim();
  if (trimmed.toUpperCase() === "UTC") return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    return "UTC";
  }
}

export function getServerTodayInTimezone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

// ----------------------------------------------------------------------------
// Emergency Symptom Detection Fast Path
// ----------------------------------------------------------------------------
const ACUTE_EMERGENCY_PATTERNS = [
  /\bchest pain\b/i,
  /\bheart attack\b/i,
  /\b(cannot|can't|unable to|difficulty) breath(e|ing)?\b/i,
  /\bshortness of breath\b/i,
  /\bchoking\b/i,
  /\banaphylax(is|ic)\b/i,
  /\bsevere allergic reaction\b/i,
  /\b(loss of consciousness|passed out|fainted and won't wake)\b/i,
  /\b(coughing|vomiting) blood\b/i,
  /\bsudden (numbness|paralysis|speech loss|facial droop)\b/i,
  /\bstroke symptoms?\b/i,
];

export function checkEmergencyFastPath(text: string): {
  isEmergency: boolean;
  emergencyMessage?: string;
} {
  const isMatch = ACUTE_EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
  if (isMatch) {
    return {
      isEmergency: true,
      emergencyMessage: EMERGENCY_ADVICE_TEXT,
    };
  }
  return { isEmergency: false };
}

// ----------------------------------------------------------------------------
// Untrusted Conversation History Validation
// ----------------------------------------------------------------------------
export function validateConversationHistory(rawHistory: unknown): {
  valid: boolean;
  error?: string;
  sanitized: AssistantChatMessage[];
} {
  if (!rawHistory) {
    return { valid: true, sanitized: [] };
  }

  if (!Array.isArray(rawHistory)) {
    return { valid: false, error: "conversationHistory must be an array of messages", sanitized: [] };
  }

  // Cap at 4 turns maximum
  const sliced = rawHistory.slice(-4);
  const sanitized: AssistantChatMessage[] = [];

  for (let i = 0; i < sliced.length; i++) {
    const item = sliced[i];
    if (!item || typeof item !== "object") {
      return { valid: false, error: "Each history item must be a valid object", sanitized: [] };
    }

    const { role, content } = item as Record<string, unknown>;

    // Strict role validation
    if (role !== "user" && role !== "assistant") {
      return {
        valid: false,
        error: `Invalid role "${String(role)}". Only "user" and "assistant" roles are permitted`,
        sanitized: [],
      };
    }

    if (typeof content !== "string" || !content.trim()) {
      return { valid: false, error: "History message content must be a non-empty string", sanitized: [] };
    }

    // Strict turn alternation: first item in window must match expected, and each must alternate
    if (i > 0 && role === sanitized[i - 1].role) {
      return {
        valid: false,
        error: "Conversation history must strictly alternate between user and assistant turns",
        sanitized: [],
      };
    }

    // Strip control characters and cap at 500 characters
    const cleanContent = content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 500);

    sanitized.push({
      role,
      content: cleanContent,
    });
  }

  return { valid: true, sanitized };
}

// ----------------------------------------------------------------------------
// Catalogue Verification Logic
// ----------------------------------------------------------------------------
export function isVerifiedCatalogueFood(log: {
  food_id?: string | null;
  is_ai_estimate?: boolean | null;
  foods?:
    | { id?: string; is_verified?: boolean }
    | Array<{ id?: string; is_verified?: boolean }>
    | null;
}): boolean {
  // 1. food_id must be a non-empty string
  if (!log || !log.food_id || typeof log.food_id !== "string" || !log.food_id.trim()) {
    return false;
  }

  // 2. food_logs.is_ai_estimate !== true (cannot be an AI estimate)
  if (log.is_ai_estimate === true) {
    return false;
  }

  // 3. Referenced public.foods record must exist and foods.is_verified === true
  const foodsRel = log.foods;
  if (!foodsRel) {
    return false;
  }

  if (Array.isArray(foodsRel)) {
    if (foodsRel.length === 0) return false;
    const match = foodsRel[0];
    return Boolean(
      match &&
      typeof match.id === "string" &&
      match.id === log.food_id &&
      match.is_verified === true
    );
  }

  if (typeof foodsRel === "object") {
    return Boolean(
      foodsRel.id === log.food_id && foodsRel.is_verified === true
    );
  }

  // Default to unverified if relationship cannot be resolved
  return false;
}

// ----------------------------------------------------------------------------
// Controlled Error for Nutrition Context Retrieval Failures
// ----------------------------------------------------------------------------
export class NutritionContextQueryError extends Error {
  constructor(message = "Failed to retrieve nutrition context from database") {
    super(message);
    this.name = "NutritionContextQueryError";
  }
}
export { NutritionContextQueryError as DiaryQueryError };

// ----------------------------------------------------------------------------
// Route Timeout Error & Bounded Execution Helper
// ----------------------------------------------------------------------------
export class RouteTimeoutError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message = "Operation timed out", code = "TIMEOUT", statusCode = 504) {
    super(message);
    this.name = "RouteTimeoutError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function executeWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error
): Promise<T> {
  if (timeoutMs <= 0) {
    throw onTimeout();
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hasSettled = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      if (!hasSettled) {
        hasSettled = true;
        controller.abort();
        reject(onTimeout());
      }
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      operation(controller.signal),
      timeoutPromise,
    ]);
    hasSettled = true;
    return result;
  } catch (err: unknown) {
    hasSettled = true;
    throw err;
  } finally {
    hasSettled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
}

interface AbortableQuery {
  abortSignal(signal: AbortSignal): this;
}

function hasAbortSignal(query: unknown): query is AbortableQuery {
  return (
    typeof query === "object" &&
    query !== null &&
    "abortSignal" in query &&
    typeof (query as AbortableQuery).abortSignal === "function"
  );
}

// ----------------------------------------------------------------------------
// Minimal User Nutrition Context Assembly
// ----------------------------------------------------------------------------
export async function assembleMinimalUserNutritionContext(
  supabase: SupabaseClient,
  userId: string,
  targetDate: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<MinimalNutritionContext> {
  const queryExecutor = async (sig?: AbortSignal): Promise<MinimalNutritionContext> => {
    const activeSignal = sig || options?.signal;

    // 1. Fetch only daily nutrition goals from profile (strictly exclude weight, height, age, gender, BMI)
    let profileQuery = supabase
      .from("profiles")
      .select("daily_calorie_goal, daily_protein_goal")
      .eq("id", userId);

    if (activeSignal && hasAbortSignal(profileQuery)) {
      profileQuery = profileQuery.abortSignal(activeSignal);
    }

    const { data: profile, error: profileError } = await profileQuery.maybeSingle();

    if (profileError) {
      const isAbort =
        activeSignal?.aborted ||
        profileError.message?.toLowerCase().includes("abort") ||
        profileError.message?.toLowerCase().includes("timeout");

      throw new NutritionContextQueryError(
        isAbort
          ? `Database query timed out for profiles: ${profileError.message}`
          : `Database query failed for profiles: ${profileError.message}`
      );
    }

    // 2. Fetch today's food logs for this authenticated user only, embedding the foods relation
    let logsQuery = supabase
      .from("food_logs")
      .select(
        "id, food_id, food_name, meal_type, quantity_g, calories, protein, carbohydrates, fat, fibre, consumption_date, logged_at, is_ai_estimate, foods(id, is_verified)"
      )
      .eq("user_id", userId)
      .eq("consumption_date", targetDate);

    if (activeSignal && hasAbortSignal(logsQuery)) {
      logsQuery = logsQuery.abortSignal(activeSignal);
    }

    const { data: rawLogs, error: logsError } = await logsQuery;

    if (logsError) {
      const isAbort =
        activeSignal?.aborted ||
        logsError.message?.toLowerCase().includes("abort") ||
        logsError.message?.toLowerCase().includes("timeout");

      throw new NutritionContextQueryError(
        isAbort
          ? `Database query timed out for food_logs: ${logsError.message}`
          : `Database query failed for food_logs: ${logsError.message}`
      );
    }

    const logs = (rawLogs || []) as Array<
      FoodLogEntry & {
        foods?:
          | { id?: string; is_verified?: boolean }
          | Array<{ id?: string; is_verified?: boolean }>
          | null;
      }
    >;
    const dailyTotals = aggregateDailyTotals(targetDate, logs);

    const loggedFoods = logs.map((log) => ({
      name: log.food_name,
      mealType: log.meal_type,
      portionGrams: log.quantity_g,
      calories: log.calories ?? 0,
      proteinGrams: log.protein ?? 0,
      isCatalogueMatch: isVerifiedCatalogueFood(log),
    }));

    return {
      targetDate,
      hasLoggedMeals: logs.length > 0,
      caloriesLogged: dailyTotals.totalCalories,
      proteinLogged: dailyTotals.totalProtein,
      calorieGoal: profile?.daily_calorie_goal ?? null,
      proteinGoal: profile?.daily_protein_goal ?? null,
      loggedFoods,
    };
  };

  if (options?.timeoutMs !== undefined && options.timeoutMs > 0) {
    return executeWithTimeout(
      queryExecutor,
      options.timeoutMs,
      () => new NutritionContextQueryError("Database context query timed out before completion")
    );
  }

  return queryExecutor();
}

// ----------------------------------------------------------------------------
// Context Relevance Strategy
// ----------------------------------------------------------------------------
export function shouldIncludeUserContext(
  message: string,
  explicitInclude?: boolean
): boolean {
  if (explicitInclude === true) return true;
  if (explicitInclude === false) return false;

  const lower = message.toLowerCase();
  const selfReferentialPatterns = [
    /\b(my|i|me|mine)\b/,
    /\b(today|yesterday)\b/,
    /\b(intake|target|goal|balance|remaining|left)\b/,
    /\b(did i|have i|what did i|how much did i)\b/,
    /\b(what can i eat|what should i have|dinner idea|lunch idea)\b/,
  ];

  const matchCount = selfReferentialPatterns.filter((p) => p.test(lower)).length;
  return matchCount >= 2;
}

// ----------------------------------------------------------------------------
// System Prompt Builder
// ----------------------------------------------------------------------------
export function buildAssistantSystemPrompt(context: MinimalNutritionContext | null): string {
  let contextBlock = "";

  if (context) {
    if (context.isDiaryUnavailable) {
      contextBlock = `
AUTHENTICATED USER DIARY CONTEXT (FOR DATE ${context.targetDate}):
- DIARY STATUS: TEMPORARILY UNAVAILABLE (DATABASE RETRIEVAL FAILED).
- CRITICAL REQUIREMENT: Do NOT state or assume the user has logged 0 meals, no food, or has an empty diary.
- Clearly inform the user that their diary records could not be retrieved from the database at this time, and suggest trying again in a moment.
`;
    } else {
      const goalsLine = `Daily Calorie Target: ${context.calorieGoal ? `${context.calorieGoal} kcal` : "Not configured"}; Daily Protein Target: ${context.proteinGoal ? `${context.proteinGoal}g` : "Not configured"}`;
      const mealsSummary =
        context.loggedFoods.length > 0
          ? context.loggedFoods
              .map((f) => {
                const statusTag = f.isCatalogueMatch
                  ? "VERIFIED CATALOGUE NUTRITION"
                  : "UNVERIFIED / ESTIMATE / USER-ENTERED";
                return `- ${f.name} (${f.mealType}, ${f.portionGrams}g, ${f.calories} kcal, ${f.proteinGrams}g protein, status: ${statusTag})`;
              })
              .join("\n")
          : "No meals logged for this date.";

      contextBlock = `
AUTHENTICATED USER DIARY CONTEXT (FOR DATE ${context.targetDate}):
- Has Logged Meals: ${context.hasLoggedMeals}
- Total Calories Logged: ${context.caloriesLogged} kcal
- Total Protein Logged: ${context.proteinLogged}g
- ${goalsLine}
- Logged Foods Detail:
${mealsSummary}
`;
    }
  } else {
    contextBlock = `USER CONTEXT: None attached for this general knowledge inquiry.`;
  }

  return `You are LocalFit's AI Nutrition & Culinary Guide.
Your role is to provide clear, helpful, educational guidance on nutrition, food, and balanced meal planning.

CULTURAL & REGIONAL KNOWLEDGE:
- You have deep familiarity with Indian and Coastal Karnataka cuisines (e.g. Bhatkal Chicken/Mutton Biryani, Neer Dosa, Pomfret Curry/Masala, Kori Rotti, Mangalore Buns, Fish Curry, Roti, Dal, Rice).
- Understand colloquial measures: 1 katori (150g), 1 cup cooked rice (158g), 1 roti (35-40g), 1 plate biryani (300-350g).

VERIFIED DATA VS. ESTIMATES (STRICT):
1. Only foods tagged as "VERIFIED CATALOGUE NUTRITION" originate from LocalFit's verified scientific database catalogue. You may describe these values as verified nutrition data.
2. Any foods tagged as "UNVERIFIED / ESTIMATE / USER-ENTERED", or any AI-generated estimates, or custom meals must NEVER be described as verified. They must be explicitly described as estimates, approximate, or unverified.
3. If reliable figures are unavailable or preparation methods vary widely (e.g. cooking fats/oils), acknowledge that reliable figures cannot be determined.
4. ZERO FABRICATION: If the user context indicates "No meals logged" or a goal is null, state clearly that no records or goals exist. NEVER invent or hallucinate meals or targets.

CLINICAL & MEDICAL BOUNDARY (NON-NEGOTIABLE):
1. You are NOT a medical doctor, clinical provider, or medical triage system.
2. NEVER diagnose medical conditions (e.g. diabetes, hypertension, PCOS, kidney disease, anemia).
3. NEVER prescribe or evaluate prescription drugs, medication dosages, or clinical treatments.
4. If a user asks about routine medical or health management conditions (e.g. managing diabetes through food), decline clinical diagnosis or treatment, provide only general dietary education, and advise consulting a qualified physician or clinical dietitian.
5. If acute emergency symptoms are discussed, immediately advise contacting local emergency services (112 / 911 / 999).

READ-ONLY INVARIANT:
You are an advisory assistant and have NO ability to insert, update, or delete diary entries, health logs, or profile settings.

${contextBlock}
`;
}

export interface QueryNutritionAssistantParams {
  message: string;
  history: AssistantChatMessage[];
  context: MinimalNutritionContext | null;
  apiKey?: string;
  fetchFn?: typeof fetch;
  totalBudgetMs?: number;
  minRemainingMs?: number;
  retryDelayMs?: number;
}

export interface GeminiQuotaErrorInfo {
  isDailyQuotaExhausted: boolean;
  quotaId?: string;
  quotaMetric?: string;
  retryDelaySeconds?: number;
  description?: string;
}

/**
 * Parses Google's structured 429 response body and detects daily quota exhaustion
 * using QuotaFailure fields (quotaId, quotaMetric, description) and RetryInfo.
 * Crucially does NOT treat every HTTP 429 as daily quota exhaustion (e.g. temporary RPM limits).
 */
export function parseGeminiQuotaError(errorJson: unknown): GeminiQuotaErrorInfo {
  if (!errorJson || typeof errorJson !== "object") {
    return { isDailyQuotaExhausted: false };
  }

  const errObj = (
    errorJson as {
      error?: {
        message?: string;
        status?: string;
        details?: unknown[];
      };
    }
  ).error;

  if (!errObj || typeof errObj !== "object") {
    return { isDailyQuotaExhausted: false };
  }

  let isDailyQuotaExhausted = false;
  let quotaId: string | undefined;
  let quotaMetric: string | undefined;
  let retryDelaySeconds: number | undefined;
  let description: string | undefined;

  const messageText = typeof errObj.message === "string" ? errObj.message : "";

  if (Array.isArray(errObj.details)) {
    for (const detail of errObj.details) {
      if (detail && typeof detail === "object") {
        const d = detail as Record<string, unknown>;
        const typeStr = typeof d["@type"] === "string" ? d["@type"] : "";

        // Check QuotaFailure violations
        if (typeStr.includes("QuotaFailure") && Array.isArray(d.violations)) {
          for (const violation of d.violations) {
            if (violation && typeof violation === "object") {
              const v = violation as Record<string, unknown>;
              if (typeof v.quotaId === "string") quotaId = v.quotaId;
              if (typeof v.quotaMetric === "string") quotaMetric = v.quotaMetric;
              if (typeof v.description === "string") description = v.description;

              const qId = (quotaId || "").toLowerCase();
              const qMet = (quotaMetric || "").toLowerCase();
              const desc = (description || "").toLowerCase();

              // Explicitly match PerDay indicators in quotaId, quotaMetric, or description
              if (
                qId.includes("perday") ||
                qMet.includes("per_day") ||
                desc.includes("per day") ||
                desc.includes("daily")
              ) {
                isDailyQuotaExhausted = true;
              }
            }
          }
        }

        // Check RetryInfo
        if (typeStr.includes("RetryInfo") && typeof d.retryDelay === "string") {
          const match = d.retryDelay.match(/^(\d+)s?$/);
          if (match) {
            retryDelaySeconds = parseInt(match[1], 10);
            // Extended delays (> 60s, e.g. 67224s) represent multi-hour daily quota exhaustion
            if (retryDelaySeconds > 60) {
              isDailyQuotaExhausted = true;
            }
          }
        }
      }
    }
  }

  // Fallback to inspecting message text if structured details are omitted
  if (!isDailyQuotaExhausted && messageText) {
    const msgLower = messageText.toLowerCase();
    if (
      msgLower.includes("per day limit exceeded") ||
      msgLower.includes("requests per day") ||
      msgLower.includes("generaterequestsperday") ||
      /please retry in\s+\d+\s*[hd]/i.test(messageText)
    ) {
      isDailyQuotaExhausted = true;
    }
  }

  return {
    isDailyQuotaExhausted,
    quotaId,
    quotaMetric,
    retryDelaySeconds,
    description,
  };
}

let primaryModelCooldownUntil = 0;

export function resetPrimaryModelCooldown(): void {
  primaryModelCooldownUntil = 0;
}

export function getPrimaryModelCooldown(): number {
  return primaryModelCooldownUntil;
}

// ----------------------------------------------------------------------------
// Core Gemini AI Assistant Caller
// ----------------------------------------------------------------------------
export async function queryNutritionAssistantWithGemini(
  params: QueryNutritionAssistantParams
): Promise<NutritionAssistantResponse> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "AI assistant service is currently unavailable. Please verify API configuration.",
      code: "API_KEY_MISSING",
      error: "GEMINI_API_KEY_NOT_CONFIGURED",
      suggestedQuestions: [],
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    };
  }

  // 1. Check server-side emergency fast-path before making external API call
  const emergencyCheck = checkEmergencyFastPath(params.message);
  if (emergencyCheck.isEmergency && emergencyCheck.emergencyMessage) {
    return {
      success: true,
      message: emergencyCheck.emergencyMessage,
      isEmergency: true,
      contextUsed: null,
      suggestedQuestions: [
        "What are emergency numbers in India?",
        "Where is the nearest hospital?",
      ],
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    };
  }

  // 2. Build system instructions and Gemini contents array
  const systemInstructionText = buildAssistantSystemPrompt(params.context);

  // Map history to Gemini format (user -> user, assistant -> model)
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const h of params.history) {
    contents.push({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    });
  }

  // Add the current user query as the final turn
  contents.push({
    role: "user",
    parts: [{ text: params.message }],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  };

  // 3. Shared execution-time budget across primary and fallback models
  const totalBudgetMs = params.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS;
  const minRemainingMs = params.minRemainingMs ?? GEMINI_MIN_REMAINING_FOR_CALL_MS;
  const deadline = Date.now() + totalBudgetMs;
  const fetchClient = params.fetchFn || fetch;

  // Optional in-memory cooldown optimization: if primary model is in active daily cooldown,
  // skip it to save roundtrip latency. Correctness does not depend on it (if reset, primary
  // is attempted, fails fast, and immediately falls back).
  const isPrimaryCoolingDown =
    primaryModelCooldownUntil > 0 && Date.now() < primaryModelCooldownUntil;

  const modelsToTry: string[] = [];
  if (!isPrimaryCoolingDown) {
    modelsToTry.push(PRIMARY_MODEL);
  }
  modelsToTry.push(FALLBACK_MODEL);

  let rawResponseText = "";
  let lastError: { code?: string; error?: string; message?: string } | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const remainingMs = deadline - Date.now();

    // Check remaining budget before dispatching request to prevent serverless boundary breach
    if (remainingMs < minRemainingMs) {
      if (!lastError || lastError.code !== "SERVICE_UNAVAILABLE") {
        lastError = {
          code: "TIMEOUT",
          error: "REQUEST_TIMEOUT",
          message: "AI assistant request timed out. Please try asking again.",
        };
      }
      break;
    }

    const perAttemptTimeoutMs = Math.max(0, remainingMs);
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, perAttemptTimeoutMs);

      const url = `${API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const res = await fetchClient(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          const errorJson = (await res.json().catch(() => null)) as unknown;
          const quotaInfo = parseGeminiQuotaError(errorJson);

          // If primary model hit daily quota exhaustion, record optional cooldown
          if (model === PRIMARY_MODEL && quotaInfo.isDailyQuotaExhausted) {
            const cooldownMs = quotaInfo.retryDelaySeconds
              ? Math.min(quotaInfo.retryDelaySeconds * 1000, 60 * 60 * 1000)
              : 60 * 60 * 1000;
            primaryModelCooldownUntil = Date.now() + cooldownMs;
          }

          lastError = {
            code: res.status === 429 ? "RATE_LIMIT_EXCEEDED" : "SERVICE_UNAVAILABLE",
            error: res.status === 429 ? "QUOTA_EXCEEDED" : "MODEL_OVERLOADED",
            message:
              res.status === 429
                ? quotaInfo.isDailyQuotaExhausted
                  ? "AI daily quota reached. Please try asking again tomorrow or contact support."
                  : "AI service temporarily experiencing high traffic. Please try again in a moment."
                : "AI service temporarily experiencing high traffic. Please try again in a moment.",
          };

          const isLastModel = i === modelsToTry.length - 1;
          if (!isLastModel) {
            // When switching to the distinct fallback model, do NOT sleep for the retry delay.
            // Proceed immediately to give the fallback model maximum available budget.
            continue;
          } else {
            // Last model reached, no subsequent model to attempt
            break;
          }
        }

        lastError = {
          code: `HTTP_${res.status}`,
          error: "MODEL_REQUEST_FAILED",
          message: "Unable to process nutrition query at this time.",
        };
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (rawResponseText) {
        break; // Stop immediately upon successful generation, no duplicate requests
      }
    } catch (err: unknown) {
      const isTimeout =
        (err instanceof Error && err.name === "AbortError") ||
        controller.signal.aborted ||
        deadline - Date.now() <= 0;

      lastError = {
        code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        error: isTimeout ? "REQUEST_TIMEOUT" : "FETCH_FAILED",
        message: isTimeout
          ? "AI assistant request timed out. Please try asking again."
          : "Network error communicating with AI assistant.",
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  }

  if (!rawResponseText) {
    return {
      success: false,
      message:
        lastError?.message ||
        "The assistant was unable to generate an answer for that query. Please try rephrasing your question.",
      code: lastError?.code || "EMPTY_RESPONSE",
      error: lastError?.error || "AI_PARSING_FAILED",
      suggestedQuestions: [],
      disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
    };
  }

  // Cap output length at 3000 characters
  const safeText = rawResponseText.trim().slice(0, 3000);

  // Context metadata for client UI
  const contextUsed = params.context
    ? {
        date: params.context.targetDate,
        hasLoggedMeals: params.context.hasLoggedMeals,
        caloriesLogged: params.context.caloriesLogged,
        calorieGoal: params.context.calorieGoal,
        proteinLogged: params.context.proteinLogged,
        proteinGoal: params.context.proteinGoal,
      }
    : null;

  return {
    success: true,
    message: safeText,
    isEmergency: false,
    contextUsed,
    suggestedQuestions: [
      "How is my protein intake today?",
      "Suggest a healthy Coastal Karnataka snack",
      "What are the macros for Bhatkal Biryani?",
    ],
    disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
  };
}
