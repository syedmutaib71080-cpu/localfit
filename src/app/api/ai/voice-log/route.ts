import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseVoiceTranscriptWithGemini } from "@/lib/ai-voice";
import {
  ROUTE_TOTAL_BUDGET_MS,
  ROUTE_RESPONSE_BUFFER_MS,
  AUTH_TIMEOUT_CEILING_MS,
  GEMINI_TOTAL_BUDGET_MS,
  executeWithTimeout,
  RouteTimeoutError,
} from "@/lib/ai-assistant";
import type { VoiceLogParseResponse } from "@/types/voice-log";
import type { MealType } from "@/types/food-log";

// In-memory sliding window rate limiter: max 15 requests per 5 minutes per user
// NOTE: This rate limiter is local to the active Node.js server process. In a distributed multi-instance
// environment, a shared Redis or database-backed store would be required for global rate enforcement.
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const voiceRateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 15;

/**
 * Checks in-memory sliding rate limit for a user.
 */
export function checkVoiceRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = voiceRateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    voiceRateLimitMap.set(identifier, {
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

/**
 * Resets voice rate limit for testing purposes.
 */
export function resetVoiceRateLimit(identifier?: string): void {
  if (identifier) {
    voiceRateLimitMap.delete(identifier);
  } else {
    voiceRateLimitMap.clear();
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<VoiceLogParseResponse>> {
  const routeDeadline = Date.now() + ROUTE_TOTAL_BUDGET_MS;

  try {
    // 1. Authenticated Supabase User Check with bounded timeout
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
            transcript: "",
            meal_type: "Lunch",
            items: [],
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
          transcript: "",
          meal_type: "Lunch",
          items: [],
          code: "UNAUTHORIZED",
          error: "UNAUTHORIZED",
          message: "Authentication required to use voice food logging. Please sign in.",
        },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // 2. Sliding Rate Limit Check
    if (!checkVoiceRateLimit(userId)) {
      return NextResponse.json(
        {
          success: false,
          transcript: "",
          meal_type: "Lunch",
          items: [],
          code: "RATE_LIMIT_EXCEEDED",
          error: "RATE_LIMIT_EXCEEDED",
          message: "Voice logging request limit reached. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    }

    // 3. Request Payload Extraction & Validation
    let body: { transcript?: unknown; meal_type?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          transcript: "",
          meal_type: "Lunch",
          items: [],
          code: "INVALID_REQUEST",
          error: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body.transcript !== "string" || body.transcript.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          transcript: "",
          meal_type: "Lunch",
          items: [],
          code: "MISSING_TRANSCRIPT",
          error: "EMPTY_TRANSCRIPT",
          message: "Please describe what you ate before submitting.",
        },
        { status: 400 }
      );
    }

    const rawTranscript = body.transcript.trim();
    if (rawTranscript.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          transcript: rawTranscript.substring(0, 1000),
          meal_type: "Lunch",
          items: [],
          code: "PAYLOAD_TOO_LARGE",
          error: "TRANSCRIPT_TOO_LONG",
          message: "Spoken meal description exceeds maximum allowed length of 1,000 characters.",
        },
        { status: 400 }
      );
    }

    const preferredMealType = typeof body.meal_type === "string" ? (body.meal_type as MealType) : undefined;

    // 4. Invoke Server-Side AI Parser with bounded remaining budget
    const remainingForGemini = Math.min(
      Math.max(0, routeDeadline - Date.now() - ROUTE_RESPONSE_BUFFER_MS),
      GEMINI_TOTAL_BUDGET_MS
    );

    const parseResult = await parseVoiceTranscriptWithGemini({
      transcript: rawTranscript,
      preferredMealType,
      timeoutMs: remainingForGemini,
    });

    if (!parseResult.success) {
      const statusCode =
        parseResult.code === "API_KEY_MISSING"
          ? 503
          : parseResult.code === "QUOTA_EXCEEDED"
          ? 429
          : parseResult.error === "REQUEST_TIMEOUT"
          ? 504
          : parseResult.code === "INVALID_REQUEST" || parseResult.error === "EMPTY_TRANSCRIPT"
          ? 400
          : 500;

      return NextResponse.json(parseResult, { status: statusCode });
    }

    // 5. Return Structured Candidates (DO NOT write to database here)
    return NextResponse.json(parseResult, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof RouteTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          transcript: "",
          meal_type: "Lunch",
          items: [],
          code: err.code || "TIMEOUT",
          error: "REQUEST_TIMEOUT",
          message: "Voice logging request timed out. Please try again.",
        },
        { status: err.statusCode || 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        transcript: "",
        meal_type: "Lunch",
        items: [],
        code: "UNKNOWN_ERROR",
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred while parsing your speech. Please try again.",
      },
      { status: 500 }
    );
  }
}
