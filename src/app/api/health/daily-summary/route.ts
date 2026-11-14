import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCalendarDate,
  getValidatedTimezone,
  getServerTodayInTimezone,
  RouteTimeoutError,
  executeWithTimeout,
  ROUTE_TOTAL_BUDGET_MS,
  ROUTE_RESPONSE_BUFFER_MS,
  AUTH_TIMEOUT_CEILING_MS,
} from "@/lib/ai-assistant";
import {
  assembleDailyHealthSummary,
  MANDATORY_DAILY_SUMMARY_DISCLAIMER,
} from "@/lib/daily-health-summary";
import type { DailyHealthSummaryResponse } from "@/types/daily-summary";

export async function GET(
  req: NextRequest
): Promise<NextResponse<DailyHealthSummaryResponse>> {
  return handleSummaryRequest(req);
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<DailyHealthSummaryResponse>> {
  return handleSummaryRequest(req);
}

async function handleSummaryRequest(
  req: NextRequest
): Promise<NextResponse<DailyHealthSummaryResponse>> {
  const routeDeadline = Date.now() + ROUTE_TOTAL_BUDGET_MS;

  try {
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
        return createErrorResponse(
          503,
          "AUTH_TIMEOUT",
          "SERVICE_UNAVAILABLE",
          "Authentication service timed out. Please try again."
        );
      }
      throw err;
    }

    if (authError || !authUser) {
      return createErrorResponse(
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_REQUIRED",
        "You must be signed in to view daily health summaries."
      );
    }

    // Parse parameters from query string or JSON body
    let targetDateParam: string | null = null;
    let timezoneParam: string | null = null;
    let enableAiParam = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetDateParam = typeof body.date === "string" ? body.date.trim() : null;
        timezoneParam = typeof body.timezone === "string" ? body.timezone.trim() : null;
        enableAiParam = Boolean(body.enableAi);
      } catch {
        // Body optional
      }
    } else {
      const { searchParams } = new URL(req.url);
      targetDateParam = searchParams.get("date")?.trim() || null;
      timezoneParam = searchParams.get("timezone")?.trim() || null;
      enableAiParam = searchParams.get("ai") === "true";
    }

    const clientTimezone = getValidatedTimezone(timezoneParam);
    const serverToday = getServerTodayInTimezone(clientTimezone);

    let targetDate = serverToday;
    if (targetDateParam) {
      if (!isValidCalendarDate(targetDateParam)) {
        return createErrorResponse(
          400,
          "INVALID_DATE",
          "BAD_REQUEST",
          "The requested date is not a valid calendar date (YYYY-MM-DD)."
        );
      }
      targetDate = targetDateParam;
    }

    const remainingForDb = Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS);

    const summary = await assembleDailyHealthSummary(supabase, authUser.id, targetDate, {
      timeoutMs: remainingForDb,
      enableAi: enableAiParam,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof RouteTimeoutError) {
      return createErrorResponse(
        err.statusCode || 504,
        err.code || "TIMEOUT",
        "REQUEST_TIMEOUT",
        "Daily health summary request timed out. Please try again."
      );
    }

    return createErrorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "INTERNAL_ERROR",
      "An unexpected error occurred while compiling your daily health summary."
    );
  }
}

function createErrorResponse(
  status: number,
  code: string,
  error: string,
  message: string
): NextResponse<DailyHealthSummaryResponse> {
  return NextResponse.json(
    {
      success: false,
      targetDate: "",
      nutrition: {
        status: "error",
        caloriesConsumed: null,
        calorieGoal: null,
        caloriesRemaining: null,
        proteinConsumedG: null,
        proteinGoalG: null,
        proteinRemainingG: null,
        loggedMealCount: 0,
        loggedMeals: [],
        completeness: { hasBreakfast: false, hasLunch: false, hasDinner: false, hasSnacks: false },
        errorMessage: message,
      },
      activity: {
        status: "error",
        totalWorkouts: 0,
        totalDurationSeconds: 0,
        totalDistanceMeters: 0,
        totalActiveCalories: null,
        totalSteps: null,
        workouts: [],
        errorMessage: message,
      },
      health: {
        weightStatus: "error",
        weightKg: null,
        weightChangeKg: null,
        weightChangeDirection: null,
        heightCm: null,
        bmi: null,
        bmiCategory: null,
        waterStatus: "error",
        waterTotalMl: null,
        waterGoalMl: null,
        waterRemainingMl: null,
        waterProgressPercent: null,
        sleepStatus: "error",
        sleepDurationMinutes: null,
        sleepGoalMinutes: null,
        sleepQuality: null,
        sleepProgressPercent: null,
        errorMessage: message,
      },
      insights: [],
      disclaimer: MANDATORY_DAILY_SUMMARY_DISCLAIMER,
      code,
      error,
      message,
    },
    { status }
  );
}
