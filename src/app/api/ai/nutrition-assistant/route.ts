import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkAssistantRateLimit,
  isValidCalendarDate,
  getValidatedTimezone,
  getServerTodayInTimezone,
  validateConversationHistory,
  assembleMinimalUserNutritionContext,
  shouldIncludeUserContext,
  queryNutritionAssistantWithGemini,
  MANDATORY_MEDICAL_DISCLAIMER,
  NutritionContextQueryError,
  RouteTimeoutError,
  executeWithTimeout,
  ROUTE_TOTAL_BUDGET_MS,
  ROUTE_RESPONSE_BUFFER_MS,
  AUTH_TIMEOUT_CEILING_MS,
  DB_TIMEOUT_CEILING_MS,
  GEMINI_TOTAL_BUDGET_MS,
} from "@/lib/ai-assistant";
import type { NutritionAssistantResponse } from "@/types/assistant";

export async function POST(
  req: NextRequest
): Promise<NextResponse<NutritionAssistantResponse>> {
  const routeDeadline = Date.now() + ROUTE_TOTAL_BUDGET_MS;

  try {
    // 1. Authenticate user session via Supabase SSR with bounded timeout
    const supabase = await createClient();
    const remainingForAuth = Math.min(
      Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS),
      AUTH_TIMEOUT_CEILING_MS
    );

    let authUser = null;
    let authError = null;

    try {
      const authResult = await executeWithTimeout(
        async () => {
          return await supabase.auth.getUser();
        },
        remainingForAuth,
        () => new RouteTimeoutError("Authentication service timed out", "AUTH_TIMEOUT", 503)
      );
      authUser = authResult.data.user;
      authError = authResult.error;
    } catch (err: unknown) {
      if (err instanceof RouteTimeoutError) {
        return NextResponse.json(
          {
            success: false,
            message: "Authentication service timed out. Please tap Retry to try again.",
            suggestedQuestions: [],
            disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
            code: "AUTH_TIMEOUT",
            error: "SERVICE_UNAVAILABLE",
          },
          { status: 503 }
        );
      }
      throw err;
    }

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be signed in to use the AI Nutrition Assistant.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "UNAUTHORIZED",
          error: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Check in-memory sliding window rate limit (20 req / 5 min per user)
    // NOTE: Process-local rate limiter; see src/lib/ai-assistant.ts for multi-instance notes.
    const isAllowed = checkAssistantRateLimit(authUser.id);
    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have reached the rate limit for assistant queries. Please wait a few minutes before asking another question.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "RATE_LIMIT_EXCEEDED",
          error: "TOO_MANY_REQUESTS",
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate JSON request body
    let body: {
      message?: unknown;
      conversationHistory?: unknown;
      timezone?: unknown;
      date?: unknown;
      includeUserContext?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "INVALID_JSON",
          error: "MALFORMED_REQUEST_BODY",
        },
        { status: 400 }
      );
    }

    // 4. Validate message
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Message is required and cannot be empty.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "MISSING_MESSAGE",
          error: "EMPTY_MESSAGE",
        },
        { status: 400 }
      );
    }

    const cleanMessage = body.message
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();

    if (cleanMessage.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Message exceeds maximum length of 1,000 characters.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "MESSAGE_TOO_LONG",
          error: "MAX_LENGTH_EXCEEDED",
        },
        { status: 400 }
      );
    }

    // 5. Validate untrusted conversation history
    const historyValidation = validateConversationHistory(body.conversationHistory);
    if (!historyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: historyValidation.error || "Invalid conversation history.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "INVALID_HISTORY",
          error: "HISTORY_VALIDATION_FAILED",
        },
        { status: 400 }
      );
    }

    // 6. Server-side timezone and date validation
    const validatedTz = getValidatedTimezone(
      typeof body.timezone === "string" ? body.timezone : null
    );
    const serverToday = getServerTodayInTimezone(validatedTz);

    let targetDate = serverToday;
    if (body.date !== undefined && body.date !== null) {
      if (typeof body.date !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Date parameter must be a string formatted as YYYY-MM-DD.",
            suggestedQuestions: [],
            disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
            code: "INVALID_DATE_FORMAT",
            error: "DATE_TYPE_ERROR",
          },
          { status: 400 }
        );
      }

      const dateStr = body.date.trim();
      // Calendar round-trip validation (rejects invalid dates like 2026-02-30)
      if (!isValidCalendarDate(dateStr)) {
        return NextResponse.json(
          {
            success: false,
            message: `"${dateStr}" is not a valid calendar date.`,
            suggestedQuestions: [],
            disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
            code: "INVALID_CALENDAR_DATE",
            error: "DATE_ROUNDTRIP_FAILED",
          },
          { status: 400 }
        );
      }

      // Check bounded date window (within past 7 days up to serverToday)
      const serverTodayDate = new Date(`${serverToday}T00:00:00.000Z`);
      const targetDateObj = new Date(`${dateStr}T00:00:00.000Z`);
      const diffDays = Math.round(
        (serverTodayDate.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Future dates cannot be queried.",
            suggestedQuestions: [],
            disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
            code: "FUTURE_DATE_REJECTED",
            error: "DATE_OUT_OF_BOUNDS",
          },
          { status: 400 }
        );
      }

      if (diffDays > 7) {
        return NextResponse.json(
          {
            success: false,
            message: "Assistant context queries are limited to the past 7 days.",
            suggestedQuestions: [],
            disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
            code: "DATE_TOO_OLD",
            error: "DATE_OUT_OF_BOUNDS",
          },
          { status: 400 }
        );
      }

      targetDate = dateStr;
    }

    // 7. Context Selection (data minimization)
    const explicitInclude =
      typeof body.includeUserContext === "boolean" ? body.includeUserContext : undefined;
    const includeContext = shouldIncludeUserContext(cleanMessage, explicitInclude);

    let userContext = null;
    if (includeContext) {
      const remainingForContext = Math.min(
        Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS),
        DB_TIMEOUT_CEILING_MS
      );

      // Assemble minimal nutrition context using ONLY server session authUser.id with bounded timeout
      userContext = await assembleMinimalUserNutritionContext(
        supabase,
        authUser.id,
        targetDate,
        { timeoutMs: remainingForContext }
      );
    }

    // 8. Query Assistant Engine with remaining shared budget
    const remainingForGemini = Math.max(
      0,
      routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS
    );
    const budgetForGemini = Math.min(remainingForGemini, GEMINI_TOTAL_BUDGET_MS);

    const result = await queryNutritionAssistantWithGemini({
      message: cleanMessage,
      history: historyValidation.sanitized,
      context: userContext,
      totalBudgetMs: budgetForGemini,
    });

    const statusCode = result.success
      ? 200
      : result.code === "TIMEOUT"
      ? 504
      : result.code === "SERVICE_UNAVAILABLE"
      ? 503
      : result.code === "RATE_LIMIT_EXCEEDED"
      ? 429
      : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (err: unknown) {
    if (err instanceof NutritionContextQueryError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to retrieve your nutrition profile or diary records at this time. Please tap Retry to try again.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: "DIARY_UNAVAILABLE",
          error: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    if (err instanceof RouteTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          message: "AI assistant request timed out. Please try asking again.",
          suggestedQuestions: [],
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          code: err.code || "TIMEOUT",
          error: "REQUEST_TIMEOUT",
        },
        { status: err.statusCode || 504 }
      );
    }

    // Never expose stack trace or raw internal error message to client
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while processing your question.",
        suggestedQuestions: [],
        disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
        code: "INTERNAL_SERVER_ERROR",
        error: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
