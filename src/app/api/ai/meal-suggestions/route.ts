import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCalendarDate,
  getValidatedTimezone,
  getServerTodayInTimezone,
  assembleMinimalUserNutritionContext,
  NutritionContextQueryError,
  RouteTimeoutError,
  executeWithTimeout,
  ROUTE_TOTAL_BUDGET_MS,
  ROUTE_RESPONSE_BUFFER_MS,
  AUTH_TIMEOUT_CEILING_MS,
  DB_TIMEOUT_CEILING_MS,
  GEMINI_TOTAL_BUDGET_MS,
} from "@/lib/ai-assistant";
import {
  checkMealSuggestionsRateLimit,
  generateMealSuggestionsWithGemini,
  MANDATORY_MEAL_DISCLAIMER,
} from "@/lib/ai-meal-suggestions";
import type {
  MealCategory,
  MealSuggestionsResponse,
  MealSuggestionsRequestPayload,
} from "@/types/meal-suggestions";

export async function POST(
  req: NextRequest
): Promise<NextResponse<MealSuggestionsResponse>> {
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
            suggestions: [],
            summary: {
              calorie_goal: null,
              protein_goal: null,
              calories_consumed: 0,
              protein_consumed: 0,
              calories_remaining: null,
              protein_remaining: null,
              target_date: "",
              logged_meal_count: 0,
            },
            disclaimer: MANDATORY_MEAL_DISCLAIMER,
            code: "AUTH_TIMEOUT",
            error: "SERVICE_UNAVAILABLE",
            message: "Authentication service timed out. Please try again.",
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
          suggestions: [],
          summary: {
            calorie_goal: null,
            protein_goal: null,
            calories_consumed: 0,
            protein_consumed: 0,
            calories_remaining: null,
            protein_remaining: null,
            target_date: "",
            logged_meal_count: 0,
          },
          disclaimer: MANDATORY_MEAL_DISCLAIMER,
          code: "UNAUTHORIZED",
          error: "AUTHENTICATION_REQUIRED",
          message: "You must be signed in to view personalized meal suggestions.",
        },
        { status: 401 }
      );
    }

    // 2. Sliding window rate limit (20 req / 5 min per user)
    const isAllowed = checkMealSuggestionsRateLimit(authUser.id);
    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          suggestions: [],
          summary: {
            calorie_goal: null,
            protein_goal: null,
            calories_consumed: 0,
            protein_consumed: 0,
            calories_remaining: null,
            protein_remaining: null,
            target_date: "",
            logged_meal_count: 0,
          },
          disclaimer: MANDATORY_MEAL_DISCLAIMER,
          code: "RATE_LIMIT_EXCEEDED",
          error: "TOO_MANY_REQUESTS",
          message: "You have reached the rate limit for meal suggestions. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate JSON request body
    let body: MealSuggestionsRequestPayload = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional; default to empty object
      body = {};
    }

    const clientTimezone = getValidatedTimezone(body.timezone);
    const serverToday = getServerTodayInTimezone(clientTimezone);

    let targetDate = serverToday;
    if (typeof body.targetDate === "string" && body.targetDate.trim()) {
      const candidateDate = body.targetDate.trim();
      if (!isValidCalendarDate(candidateDate)) {
        return NextResponse.json(
          {
            success: false,
            suggestions: [],
            summary: {
              calorie_goal: null,
              protein_goal: null,
              calories_consumed: 0,
              protein_consumed: 0,
              calories_remaining: null,
              protein_remaining: null,
              target_date: candidateDate,
              logged_meal_count: 0,
            },
            disclaimer: MANDATORY_MEAL_DISCLAIMER,
            code: "INVALID_DATE",
            error: "BAD_REQUEST",
            message: "The requested date is not a valid calendar date (YYYY-MM-DD).",
          },
          { status: 400 }
        );
      }
      targetDate = candidateDate;
    }

    let mealCategory: MealCategory | "All" = "All";
    if (body.mealCategory) {
      const cat = String(body.mealCategory).trim().toLowerCase();
      if (cat === "breakfast") mealCategory = "Breakfast";
      else if (cat === "lunch") mealCategory = "Lunch";
      else if (cat === "dinner") mealCategory = "Dinner";
      else if (cat === "snacks" || cat === "snack") mealCategory = "Snacks";
      else if (cat === "all") mealCategory = "All";
    }

    // 4. Assemble minimal user nutrition context from database (bounded timeout)
    const remainingForDb = Math.min(
      Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS),
      DB_TIMEOUT_CEILING_MS
    );

    let userContext;
    try {
      userContext = await assembleMinimalUserNutritionContext(
        supabase,
        authUser.id,
        targetDate,
        { timeoutMs: remainingForDb }
      );
    } catch (err: unknown) {
      if (err instanceof NutritionContextQueryError) {
        return NextResponse.json(
          {
            success: false,
            suggestions: [],
            summary: {
              calorie_goal: null,
              protein_goal: null,
              calories_consumed: 0,
              protein_consumed: 0,
              calories_remaining: null,
              protein_remaining: null,
              target_date: targetDate,
              logged_meal_count: 0,
            },
            disclaimer: MANDATORY_MEAL_DISCLAIMER,
            code: "DIARY_UNAVAILABLE",
            error: "DATABASE_UNAVAILABLE",
            message: "Unable to retrieve your nutrition profile or diary records at this time. Please try again.",
          },
          { status: 503 }
        );
      }
      throw err;
    }

    // 5. Generate meal suggestions with Gemini (with shared timeout & fallback)
    const remainingForGemini = Math.min(
      Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS),
      GEMINI_TOTAL_BUDGET_MS
    );

    const result = await generateMealSuggestionsWithGemini({
      context: userContext,
      filterCategory: mealCategory,
      totalBudgetMs: remainingForGemini,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof RouteTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          suggestions: [],
          summary: {
            calorie_goal: null,
            protein_goal: null,
            calories_consumed: 0,
            protein_consumed: 0,
            calories_remaining: null,
            protein_remaining: null,
            target_date: "",
            logged_meal_count: 0,
          },
          disclaimer: MANDATORY_MEAL_DISCLAIMER,
          code: err.code || "TIMEOUT",
          error: "REQUEST_TIMEOUT",
          message: "Meal suggestions request timed out. Please try again.",
        },
        { status: err.statusCode || 504 }
      );
    }

    // Never expose stack trace or raw internal errors to client
    return NextResponse.json(
      {
        success: false,
        suggestions: [],
        summary: {
          calorie_goal: null,
          protein_goal: null,
          calories_consumed: 0,
          protein_consumed: 0,
          calories_remaining: null,
          protein_remaining: null,
          target_date: "",
          logged_meal_count: 0,
        },
        disclaimer: MANDATORY_MEAL_DISCLAIMER,
        code: "INTERNAL_SERVER_ERROR",
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred while generating meal suggestions.",
      },
      { status: 500 }
    );
  }
}
