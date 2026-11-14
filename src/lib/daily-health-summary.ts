import { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateBmi,
  classifyBmi,
  calculateWeightChange,
  calculateWaterGoalProgress,
} from "@/lib/health-calculator";
import {
  executeWithTimeout,
  RouteTimeoutError,
  PRIMARY_MODEL,
  API_BASE_URL,
  GEMINI_TOTAL_BUDGET_MS,
  GEMINI_MIN_REMAINING_FOR_CALL_MS,
  parseGeminiQuotaError,
  getPrimaryModelCooldown,
} from "@/lib/ai-assistant";
import type {
  DailyHealthSummaryResponse,
  NutritionPillarSummary,
  ActivityPillarSummary,
  HealthPillarSummary,
  HealthInsightItem,
  LoggedMealItem,
  ActivityWorkoutSummaryItem,
} from "@/types/daily-summary";

export const MANDATORY_DAILY_SUMMARY_DISCLAIMER =
  "Daily summaries and multi-pillar insights provide educational observations based on your recorded data. They do not constitute clinical diagnoses, medical assessments, or treatment plans. Always consult a qualified healthcare provider for clinical health advice.";

// ----------------------------------------------------------------------------
// Deterministic Multi-Pillar Insights Engine
// ----------------------------------------------------------------------------
export function generateDeterministicHealthInsights(
  nutrition: NutritionPillarSummary,
  activity: ActivityPillarSummary,
  health: HealthPillarSummary
): HealthInsightItem[] {
  const insights: HealthInsightItem[] = [];
  let idCounter = 1;

  // 1. NUTRITION PILLAR INSIGHTS
  if (nutrition.status === "recorded") {
    // Protein target insight
    if (nutrition.proteinGoalG !== null && nutrition.proteinConsumedG !== null) {
      if (nutrition.proteinConsumedG < nutrition.proteinGoalG * 0.6) {
        const remaining = Math.max(0, Math.round(nutrition.proteinGoalG - nutrition.proteinConsumedG));
        insights.push({
          id: `ins-nut-${idCounter++}`,
          pillar: "nutrition",
          category: "target_progress",
          title: "Protein Intake Below Configured Goal",
          observation: `Recorded protein intake is ${nutrition.proteinConsumedG}g towards your ${nutrition.proteinGoalG}g daily target (${remaining}g remaining). Incorporating protein-dense foods like eggs, lentils, fish, or dairy can help support your target.`,
          isAiGenerated: false,
        });
      } else if (nutrition.proteinConsumedG >= nutrition.proteinGoalG) {
        insights.push({
          id: `ins-nut-${idCounter++}`,
          pillar: "nutrition",
          category: "target_progress",
          title: "Protein Target Achieved",
          observation: `You reached ${nutrition.proteinConsumedG}g of protein today, meeting or exceeding your configured daily goal of ${nutrition.proteinGoalG}g.`,
          isAiGenerated: false,
        });
      }
    }

    // Calorie budget insight
    if (nutrition.calorieGoal !== null && nutrition.caloriesConsumed !== null) {
      if (nutrition.caloriesRemaining !== null && nutrition.caloriesRemaining < 250 && nutrition.caloriesRemaining > 0) {
        insights.push({
          id: `ins-nut-${idCounter++}`,
          pillar: "nutrition",
          category: "caution",
          title: "Approaching Calorie Target",
          observation: `Calories consumed (${nutrition.caloriesConsumed} kcal) are near your ${nutrition.calorieGoal} kcal target, with ${nutrition.caloriesRemaining} kcal remaining for the day.`,
          isAiGenerated: false,
        });
      }
    }

    // Meal logging completeness
    const { hasBreakfast, hasLunch, hasDinner } = nutrition.completeness;
    if (hasBreakfast && hasLunch && hasDinner) {
      insights.push({
        id: `ins-nut-${idCounter++}`,
        pillar: "nutrition",
        category: "consistency",
        title: "Consistent Meal Diary",
        observation: "All three primary meals (breakfast, lunch, and dinner) have been recorded for today.",
        isAiGenerated: false,
      });
    }
  } else if (nutrition.status === "empty") {
    insights.push({
      id: `ins-nut-${idCounter++}`,
      pillar: "nutrition",
      category: "target_progress",
      title: "No Nutrition Records Today",
      observation: "No meals or snacks have been logged for this date. Logging meals regularly helps track calorie and protein distribution.",
      isAiGenerated: false,
    });
  }

  // 2. ACTIVITY PILLAR INSIGHTS
  if (activity.status === "recorded") {
    if (activity.totalWorkouts > 0) {
      const minutes = Math.round(activity.totalDurationSeconds / 60);
      const km = (activity.totalDistanceMeters / 1000).toFixed(1);
      const calText = activity.totalActiveCalories ? ` with ~${activity.totalActiveCalories} estimated active calories` : "";

      insights.push({
        id: `ins-act-${idCounter++}`,
        pillar: "activity",
        category: "consistency",
        title: "Active Workout Movement Logged",
        observation: `Recorded ${activity.totalWorkouts} workout(s) totaling ${minutes} minutes (${km} km)${calText} today.`,
        isAiGenerated: false,
      });
    }

    if (activity.totalSteps !== null && activity.totalSteps >= 8000) {
      insights.push({
        id: `ins-act-${idCounter++}`,
        pillar: "activity",
        category: "target_progress",
        title: "High Daily Step Volume",
        observation: `Recorded ${activity.totalSteps.toLocaleString()} steps today, reflecting strong ambulatory movement throughout the day.`,
        isAiGenerated: false,
      });
    }
  }

  // 3. HEALTH TRACKING INSIGHTS (WATER, SLEEP, WEIGHT)
  if (health.waterStatus === "recorded") {
    if (health.waterGoalMl !== null && health.waterTotalMl !== null) {
      if (health.waterTotalMl < health.waterGoalMl * 0.7) {
        const remaining = Math.max(0, health.waterGoalMl - health.waterTotalMl);
        insights.push({
          id: `ins-hea-${idCounter++}`,
          pillar: "health",
          category: "target_progress",
          title: "Hydration Below Daily Target",
          observation: `Recorded water intake is ${health.waterTotalMl}ml of your ${health.waterGoalMl}ml goal (${remaining}ml remaining). Consistent hydration supports daily energy and recovery.`,
          isAiGenerated: false,
        });
      } else if (health.waterTotalMl >= health.waterGoalMl) {
        insights.push({
          id: `ins-hea-${idCounter++}`,
          pillar: "health",
          category: "target_progress",
          title: "Daily Hydration Goal Met",
          observation: `You reached ${health.waterTotalMl}ml of water today, fulfilling your ${health.waterGoalMl}ml daily hydration target.`,
          isAiGenerated: false,
        });
      }
    }
  }

  if (health.sleepStatus === "recorded") {
    if (health.sleepGoalMinutes !== null && health.sleepDurationMinutes !== null) {
      const hours = Math.floor(health.sleepDurationMinutes / 60);
      const mins = health.sleepDurationMinutes % 60;
      const targetHours = (health.sleepGoalMinutes / 60).toFixed(1);

      if (health.sleepDurationMinutes < health.sleepGoalMinutes - 30) {
        insights.push({
          id: `ins-hea-${idCounter++}`,
          pillar: "health",
          category: "caution",
          title: "Recorded Sleep Below Target",
          observation: `Logged sleep duration of ${hours}h ${mins}m is below your ${targetHours}h target. Rest is critical for muscular recovery and cognitive focus.`,
          isAiGenerated: false,
        });
      }
    }
  }

  if (health.weightStatus === "recorded" && health.weightChangeKg !== null) {
    const changeAbs = Math.abs(health.weightChangeKg).toFixed(1);
    const dirText = health.weightChangeDirection === "loss" ? "lower" : health.weightChangeDirection === "gain" ? "higher" : "unchanged";

    insights.push({
      id: `ins-hea-${idCounter++}`,
      pillar: "health",
      category: "trend",
      title: "Recorded Weight Trajectory",
      observation: `Latest recorded weight of ${health.weightKg} kg is ${changeAbs} kg ${dirText} compared to your previous entry. Short-term daily variations commonly reflect fluid balance and digestive mass rather than fat or muscle change.`,
      isAiGenerated: false,
    });
  }

  // 4. CROSS-PILLAR SYNERGY (NUTRITION + ACTIVITY)
  if (
    nutrition.status === "recorded" &&
    nutrition.caloriesConsumed !== null &&
    activity.status === "recorded" &&
    activity.totalActiveCalories !== null &&
    activity.totalActiveCalories > 0
  ) {
    const net = nutrition.caloriesConsumed - activity.totalActiveCalories;
    insights.push({
      id: `ins-mul-${idCounter++}`,
      pillar: "multi_pillar",
      category: "balance",
      title: "Nutrition & Activity Co-occurrence",
      observation: `Observed ${nutrition.caloriesConsumed} kcal consumed alongside an estimated ~${activity.totalActiveCalories} active kcal burned across workouts (net energy balance: ~${net} kcal). Both pillars contribute together to daily energy turnover.`,
      isAiGenerated: false,
    });
  }

  return insights;
}

// ----------------------------------------------------------------------------
// Optional Gemini AI Insights Synthesis
// ----------------------------------------------------------------------------
export interface GeminiSynthesizeParams {
  nutrition: NutritionPillarSummary;
  activity: ActivityPillarSummary;
  health: HealthPillarSummary;
  targetDate: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
  totalBudgetMs?: number;
}

export async function synthesizeInsightsWithGemini(
  params: GeminiSynthesizeParams
): Promise<HealthInsightItem[]> {
  const deterministicBase = generateDeterministicHealthInsights(
    params.nutrition,
    params.activity,
    params.health
  );

  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return deterministicBase;
  }

  // Cooldown check
  const cooldownUntil = getPrimaryModelCooldown();
  if (cooldownUntil > 0 && Date.now() < cooldownUntil) {
    return deterministicBase;
  }

  const prompt = `You are LocalFit's AI Multi-Pillar Health Analyst.
Review the following derived daily health summary metrics (NO PII) and synthesize 2 to 3 concise, cautious, helpful observations.

STRICT CLINICAL & SAFETY RULES:
1. NEVER claim that one metric directly caused another (e.g. do NOT say "running caused weight loss" or "eating dal caused hydration").
2. NEVER diagnose any clinical disease, disorder, or condition.
3. NEVER prescribe clinical medications, restrictive diets, or medical therapies.
4. Avoid definitive conclusions from a single day's data; acknowledge daily fluid or logging variability.
5. NEVER alter any numerical values. Use the exact numbers provided.

DATA SUMMARY FOR ${params.targetDate}:
- Nutrition: Consumed ${params.nutrition.caloriesConsumed ?? "N/A"} kcal (Goal: ${params.nutrition.calorieGoal ?? "None"}), Protein: ${params.nutrition.proteinConsumedG ?? "N/A"}g (Goal: ${params.nutrition.proteinGoalG ?? "None"}), Meals logged: ${params.nutrition.loggedMealCount}.
- Activity: ${params.activity.totalWorkouts} workouts, ${Math.round(params.activity.totalDurationSeconds / 60)} min active duration, ~${params.activity.totalActiveCalories ?? "N/A"} active kcal, ${params.activity.totalSteps ?? "N/A"} steps.
- Health: Weight: ${params.health.weightKg ?? "N/A"} kg (BMI: ${params.health.bmi ?? "N/A"}), Water: ${params.health.waterTotalMl ?? "N/A"}ml (Goal: ${params.health.waterGoalMl ?? "None"}), Sleep: ${params.health.sleepDurationMinutes ? `${Math.floor(params.health.sleepDurationMinutes / 60)}h ${params.health.sleepDurationMinutes % 60}m` : "N/A"} (Goal: ${params.health.sleepGoalMinutes ? `${Math.floor(params.health.sleepGoalMinutes / 60)}h` : "None"}).

Return a JSON array of objects with keys:
[
  {
    "pillar": "nutrition" | "activity" | "health" | "multi_pillar",
    "category": "target_progress" | "consistency" | "caution" | "trend" | "balance",
    "title": string (max 40 chars),
    "observation": string (max 200 chars)
  }
]`;

  const fetchClient = params.fetchFn || fetch;
  const deadline = Date.now() + (params.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS);
  const remaining = deadline - Date.now();

  if (remaining < GEMINI_MIN_REMAINING_FOR_CALL_MS) {
    return deterministicBase;
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, remaining);

    const url = `${API_BASE_URL}/${PRIMARY_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetchClient(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 503) {
        const errJson = await res.json().catch(() => null);
        parseGeminiQuotaError(errJson);
      }
      return deterministicBase;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return deterministicBase;

    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed) || parsed.length === 0) return deterministicBase;

    const aiInsights: HealthInsightItem[] = parsed.map((item: Record<string, unknown>, idx: number) => ({
      id: `ins-ai-${idx + 1}`,
      pillar: ["nutrition", "activity", "health", "multi_pillar"].includes(String(item.pillar))
        ? (item.pillar as HealthInsightItem["pillar"])
        : "multi_pillar",
      category: ["target_progress", "consistency", "caution", "trend", "balance"].includes(String(item.category))
        ? (item.category as HealthInsightItem["category"])
        : "balance",
      title: typeof item.title === "string" ? item.title.slice(0, 60) : "Health Observation",
      observation: typeof item.observation === "string" ? item.observation.slice(0, 300) : "",
      isAiGenerated: true,
    })).filter((i) => Boolean(i.observation));

    return aiInsights.length > 0 ? aiInsights : deterministicBase;
  } catch {
    return deterministicBase;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
}

// ----------------------------------------------------------------------------
// Main Multi-Pillar Health Summary Assembler
// ----------------------------------------------------------------------------
export interface AssembleDailySummaryOptions {
  timeoutMs?: number;
  enableAi?: boolean;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export async function assembleDailyHealthSummary(
  supabase: SupabaseClient,
  userId: string,
  targetDate: string,
  options?: AssembleDailySummaryOptions
): Promise<DailyHealthSummaryResponse> {
  // 1. Fetch user profile goals and baseline anthropometrics
  const profilePromise = supabase
    .from("profiles")
    .select("daily_calorie_goal, daily_protein_goal, daily_water_goal_ml, daily_sleep_goal_minutes, height_cm, weight_kg")
    .eq("id", userId)
    .maybeSingle();

  // 2. Fetch food logs for targetDate
  const foodLogsPromise = supabase
    .from("food_logs")
    .select("id, food_name, meal_type, calories, protein, quantity_g")
    .eq("user_id", userId)
    .eq("consumption_date", targetDate);

  // 3. Fetch activity workouts overlapping targetDate
  const workoutsPromise = supabase
    .from("activity_workouts")
    .select("id, activity_type, duration_seconds, distance_meters, estimated_calories, start_time")
    .eq("user_id", userId)
    .gte("start_time", `${targetDate}T00:00:00.000Z`)
    .lte("start_time", `${targetDate}T23:59:59.999Z`);

  // 4. Fetch daily steps for targetDate
  const stepsPromise = supabase
    .from("daily_steps")
    .select("steps, step_date")
    .eq("user_id", userId)
    .eq("step_date", targetDate)
    .maybeSingle();

  // 5. Fetch weight log on targetDate + previous log for trend
  const weightLogsPromise = supabase
    .from("weight_logs")
    .select("id, weight_kg, logged_date")
    .eq("user_id", userId)
    .lte("logged_date", targetDate)
    .order("logged_date", { ascending: false })
    .limit(2);

  // 6. Fetch water intake logs for targetDate
  const waterLogsPromise = supabase
    .from("water_logs")
    .select("id, amount_ml, intake_date")
    .eq("user_id", userId)
    .eq("intake_date", targetDate);

  // 7. Fetch sleep log for targetDate
  const sleepLogsPromise = supabase
    .from("sleep_logs")
    .select("id, duration_minutes, sleep_quality, sleep_date")
    .eq("user_id", userId)
    .eq("sleep_date", targetDate)
    .maybeSingle();

  // Execute all queries concurrently with bounded timeout
  const timeoutMs = options?.timeoutMs ?? 5000;

  const [
    profileResult,
    foodResult,
    workoutsResult,
    stepsResult,
    weightResult,
    waterResult,
    sleepResult,
  ] = await executeWithTimeout(
    async () => {
      return await Promise.all([
        profilePromise,
        foodLogsPromise,
        workoutsPromise,
        stepsPromise,
        weightLogsPromise,
        waterLogsPromise,
        sleepLogsPromise,
      ]);
    },
    timeoutMs,
    () => new RouteTimeoutError("Database queries timed out while generating health summary", "DB_TIMEOUT", 503)
  );

  // ----------------------------------------------------------------------------
  // Process Profiles & Goals
  // ----------------------------------------------------------------------------
  const profile = profileResult.data;
  const calorieGoal = typeof profile?.daily_calorie_goal === "number" && profile.daily_calorie_goal > 0
    ? profile.daily_calorie_goal
    : null;
  const proteinGoal = typeof profile?.daily_protein_goal === "number" && profile.daily_protein_goal > 0
    ? profile.daily_protein_goal
    : null;
  const waterGoal = typeof profile?.daily_water_goal_ml === "number" && profile.daily_water_goal_ml > 0
    ? profile.daily_water_goal_ml
    : null;
  const sleepGoal = typeof profile?.daily_sleep_goal_minutes === "number" && profile.daily_sleep_goal_minutes > 0
    ? profile.daily_sleep_goal_minutes
    : null;
  const heightCm = typeof profile?.height_cm === "number" && profile.height_cm > 0
    ? profile.height_cm
    : null;

  // ----------------------------------------------------------------------------
  // Process Nutrition Pillar
  // ----------------------------------------------------------------------------
  let nutritionPillar: NutritionPillarSummary;
  if (foodResult.error) {
    nutritionPillar = {
      status: "error",
      caloriesConsumed: null,
      calorieGoal,
      caloriesRemaining: null,
      proteinConsumedG: null,
      proteinGoalG: proteinGoal,
      proteinRemainingG: null,
      loggedMealCount: 0,
      loggedMeals: [],
      completeness: { hasBreakfast: false, hasLunch: false, hasDinner: false, hasSnacks: false },
      errorMessage: foodResult.error.message,
    };
  } else {
    const logs = (foodResult.data || []) as Array<{
      id: string;
      food_name: string;
      meal_type: string;
      calories: number;
      protein: number;
    }>;

    if (logs.length === 0) {
      nutritionPillar = {
        status: "empty",
        caloriesConsumed: null,
        calorieGoal,
        caloriesRemaining: calorieGoal,
        proteinConsumedG: null,
        proteinGoalG: proteinGoal,
        proteinRemainingG: proteinGoal,
        loggedMealCount: 0,
        loggedMeals: [],
        completeness: { hasBreakfast: false, hasLunch: false, hasDinner: false, hasSnacks: false },
      };
    } else {
      let totalCalories = 0;
      let totalProtein = 0;
      const completeness = {
        hasBreakfast: false,
        hasLunch: false,
        hasDinner: false,
        hasSnacks: false,
      };

      const mappedMeals: LoggedMealItem[] = logs.map((log) => {
        const cals = Number(log.calories) || 0;
        const prot = Number(log.protein) || 0;
        totalCalories += cals;
        totalProtein += prot;

        const mt = (log.meal_type || "").toLowerCase();
        if (mt === "breakfast") completeness.hasBreakfast = true;
        else if (mt === "lunch") completeness.hasLunch = true;
        else if (mt === "dinner") completeness.hasDinner = true;
        else if (mt === "snacks" || mt === "snack") completeness.hasSnacks = true;

        return {
          id: log.id,
          name: log.food_name,
          mealType: log.meal_type,
          calories: Math.round(cals),
          proteinG: Math.round(prot * 10) / 10,
        };
      });

      const roundedCalories = Math.round(totalCalories);
      const roundedProtein = Math.round(totalProtein * 10) / 10;
      const caloriesRemaining = calorieGoal !== null ? Math.max(0, calorieGoal - roundedCalories) : null;
      const proteinRemainingG = proteinGoal !== null ? Math.max(0, Math.round((proteinGoal - roundedProtein) * 10) / 10) : null;

      nutritionPillar = {
        status: "recorded",
        caloriesConsumed: roundedCalories,
        calorieGoal,
        caloriesRemaining,
        proteinConsumedG: roundedProtein,
        proteinGoalG: proteinGoal,
        proteinRemainingG,
        loggedMealCount: logs.length,
        loggedMeals: mappedMeals,
        completeness,
      };
    }
  }

  // ----------------------------------------------------------------------------
  // Process Activity Pillar
  // ----------------------------------------------------------------------------
  let activityPillar: ActivityPillarSummary;
  if (workoutsResult.error) {
    activityPillar = {
      status: "error",
      totalWorkouts: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      totalActiveCalories: null,
      totalSteps: null,
      workouts: [],
      errorMessage: workoutsResult.error.message,
    };
  } else {
    const rawWorkouts = (workoutsResult.data || []) as Array<{
      id: string;
      activity_type: string;
      duration_seconds: number;
      distance_meters: number;
      estimated_calories: number | null;
    }>;

    const stepEntry = stepsResult.data as { steps?: number } | null;
    const totalSteps = typeof stepEntry?.steps === "number" ? stepEntry.steps : null;

    if (rawWorkouts.length === 0 && totalSteps === null) {
      activityPillar = {
        status: "empty",
        totalWorkouts: 0,
        totalDurationSeconds: 0,
        totalDistanceMeters: 0,
        totalActiveCalories: null,
        totalSteps: null,
        workouts: [],
      };
    } else {
      let durSec = 0;
      let distM = 0;
      let activeCals = 0;
      let hasCalories = false;

      const mappedWorkouts: ActivityWorkoutSummaryItem[] = rawWorkouts.map((w) => {
        durSec += Number(w.duration_seconds) || 0;
        distM += Number(w.distance_meters) || 0;
        if (typeof w.estimated_calories === "number" && w.estimated_calories > 0) {
          activeCals += w.estimated_calories;
          hasCalories = true;
        }

        return {
          id: w.id,
          activityType: w.activity_type,
          durationSeconds: w.duration_seconds,
          distanceMeters: w.distance_meters,
          estimatedCalories: w.estimated_calories,
        };
      });

      activityPillar = {
        status: "recorded",
        totalWorkouts: rawWorkouts.length,
        totalDurationSeconds: durSec,
        totalDistanceMeters: distM,
        totalActiveCalories: hasCalories ? Math.round(activeCals) : null,
        totalSteps,
        workouts: mappedWorkouts,
      };
    }
  }

  // ----------------------------------------------------------------------------
  // Process Health Pillar (Weight, Water, Sleep)
  // ----------------------------------------------------------------------------
  let weightStatus: HealthPillarSummary["weightStatus"] = "empty";
  let weightKg: number | null = null;
  let weightChangeKg: number | null = null;
  let weightChangeDirection: HealthPillarSummary["weightChangeDirection"] = null;
  let bmi: number | null = null;
  let bmiCategory: string | null = null;

  if (weightResult.error) {
    weightStatus = "error";
  } else {
    const weightLogs = (weightResult.data || []) as Array<{
      id: string;
      weight_kg: number;
      logged_date: string;
    }>;

    const currentLog = weightLogs.find((l) => l.logged_date === targetDate) || weightLogs[0];
    if (currentLog && typeof currentLog.weight_kg === "number" && currentLog.weight_kg > 0) {
      weightStatus = "recorded";
      weightKg = currentLog.weight_kg;

      // Calculate BMI
      if (heightCm !== null && heightCm > 0) {
        bmi = calculateBmi(weightKg, heightCm);
        bmiCategory = classifyBmi(bmi);
      }

      // Check weight change compared to previous log
      if (weightLogs.length > 1) {
        const prev = weightLogs[1];
        if (prev && typeof prev.weight_kg === "number") {
          const delta = calculateWeightChange(currentLog.weight_kg, prev.weight_kg);
          weightChangeKg = delta.differenceKg;
          weightChangeDirection = delta.direction;
        }
      }
    } else if (typeof profile?.weight_kg === "number" && profile.weight_kg > 0) {
      // Profile baseline weight fallback
      weightStatus = "recorded";
      weightKg = profile.weight_kg;
      if (heightCm !== null && heightCm > 0) {
        bmi = calculateBmi(weightKg, heightCm);
        bmiCategory = classifyBmi(bmi);
      }
    }
  }

  // Water calculation
  let waterStatus: HealthPillarSummary["waterStatus"] = "empty";
  let waterTotalMl: number | null = null;
  let waterRemainingMl: number | null = null;
  let waterProgressPercent: number | null = null;

  if (waterResult.error) {
    waterStatus = "error";
  } else {
    const rawWater = (waterResult.data || []) as Array<{ amount_ml: number }>;
    if (rawWater.length > 0) {
      waterStatus = "recorded";
      const total = rawWater.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);
      waterTotalMl = Math.round(total);
      if (waterGoal !== null) {
        waterRemainingMl = Math.max(0, waterGoal - waterTotalMl);
        waterProgressPercent = calculateWaterGoalProgress(waterTotalMl, waterGoal);
      }
    } else {
      waterStatus = "empty";
      waterTotalMl = null;
      waterRemainingMl = waterGoal;
    }
  }

  // Sleep calculation
  let sleepStatus: HealthPillarSummary["sleepStatus"] = "empty";
  let sleepDurationMinutes: number | null = null;
  let sleepQuality: string | null = null;
  let sleepProgressPercent: number | null = null;

  if (sleepResult.error) {
    sleepStatus = "error";
  } else {
    const rawSleep = sleepResult.data as { duration_minutes?: number; sleep_quality?: string } | null;
    if (rawSleep && typeof rawSleep.duration_minutes === "number" && rawSleep.duration_minutes > 0) {
      sleepStatus = "recorded";
      sleepDurationMinutes = rawSleep.duration_minutes;
      sleepQuality = rawSleep.sleep_quality || null;
      if (sleepGoal !== null && sleepGoal > 0) {
        sleepProgressPercent = Math.min(100, Math.round((sleepDurationMinutes / sleepGoal) * 100));
      }
    } else {
      sleepStatus = "empty";
      sleepDurationMinutes = null;
    }
  }

  const healthPillar: HealthPillarSummary = {
    weightStatus,
    weightKg,
    weightChangeKg,
    weightChangeDirection,
    heightCm,
    bmi,
    bmiCategory,
    waterStatus,
    waterTotalMl,
    waterGoalMl: waterGoal,
    waterRemainingMl,
    waterProgressPercent,
    sleepStatus,
    sleepDurationMinutes,
    sleepGoalMinutes: sleepGoal,
    sleepQuality,
    sleepProgressPercent,
  };

  // ----------------------------------------------------------------------------
  // Generate Insights
  // ----------------------------------------------------------------------------
  let insights: HealthInsightItem[];
  if (options?.enableAi) {
    insights = await synthesizeInsightsWithGemini({
      nutrition: nutritionPillar,
      activity: activityPillar,
      health: healthPillar,
      targetDate,
      apiKey: options.apiKey,
      fetchFn: options.fetchFn,
      totalBudgetMs: options.timeoutMs,
    });
  } else {
    insights = generateDeterministicHealthInsights(
      nutritionPillar,
      activityPillar,
      healthPillar
    );
  }

  return {
    success: true,
    targetDate,
    nutrition: nutritionPillar,
    activity: activityPillar,
    health: healthPillar,
    insights,
    disclaimer: MANDATORY_DAILY_SUMMARY_DISCLAIMER,
  };
}
