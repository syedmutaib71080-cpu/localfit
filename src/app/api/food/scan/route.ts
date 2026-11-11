import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFoodImageWithGemini } from "@/lib/gemini";
import type { FoodScanApiResponse } from "@/types/food-scan";

// In-memory sliding window rate limiter: max 10 requests per 5 minutes per user
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Checks in-memory sliding rate limit for a user.
 */
export function checkScanRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
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
 * Resets rate limit for testing purposes.
 */
export function resetScanRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitMap.delete(identifier);
  } else {
    rateLimitMap.clear();
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<FoodScanApiResponse>> {
  try {
    // 1. Authenticated User Check (Strictly require authenticated session)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      }
    } catch {
      // Auth client failure or unauthenticated session
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "UNAUTHORIZED",
          message: "Authentication required to scan food photos. Please sign in.",
        },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Check
    if (!checkScanRateLimit(userId)) {
      return NextResponse.json(
        {
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          error: "RATE_LIMIT_EXCEEDED",
          message: "Scan request limit reached. Please wait a few minutes before scanning again.",
        },
        { status: 429 }
      );
    }

    // 3. Request Payload Extraction & Validation
    const contentType = req.headers.get("content-type") || "";
    let imageBase64 = "";
    let mimeType = "image/jpeg";
    let byteLength = 0;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (!body || !body.imageBase64) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_IMAGE",
            error: "MISSING_IMAGE",
            message: "Missing imageBase64 in request body.",
          },
          { status: 400 }
        );
      }
      imageBase64 = String(body.imageBase64);
      mimeType = String(body.mimeType || "image/jpeg").toLowerCase();
      // Estimate base64 byte length: 3 bytes for every 4 base64 chars
      byteLength = Math.floor((imageBase64.length * 3) / 4);
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      const file = formData?.get("image");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_IMAGE",
            error: "MISSING_FILE",
            message: "No image file provided in form data.",
          },
          { status: 400 }
        );
      }

      mimeType = (file.type || "image/jpeg").toLowerCase();
      byteLength = file.size;

      // In-memory buffer extraction without persistent disk write
      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString("base64");
    } else {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_IMAGE",
          error: "UNSUPPORTED_CONTENT_TYPE",
          message: "Request must be application/json or multipart/form-data.",
        },
        { status: 400 }
      );
    }

    // 4. File Size Limits (Max 10MB)
    if (byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYLOAD_TOO_LARGE",
          error: "PAYLOAD_TOO_LARGE",
          message: "Image exceeds the maximum allowed file size of 10MB.",
        },
        { status: 413 }
      );
    }

    // 5. Supported Image MIME Types: strictly JPEG, PNG, WebP
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_IMAGE",
          error: "UNSUPPORTED_FORMAT",
          message: "Unsupported image format. Allowed formats are JPEG, PNG, and WebP.",
        },
        { status: 400 }
      );
    }

    // 6. Invoke Server-Side Gemini Vision Service (In-memory processing)
    const scanResult = await analyzeFoodImageWithGemini({
      imageBase64,
      mimeType,
    });

    if (!scanResult.success) {
      const statusCode =
        scanResult.code === "API_KEY_MISSING"
          ? 503
          : scanResult.code === "QUOTA_EXCEEDED"
          ? 429
          : scanResult.code === "NO_FOOD_DETECTED"
          ? 200 // Friendly 200 with no-food-detected payload
          : scanResult.code === "INVALID_IMAGE"
          ? 400
          : scanResult.error === "REQUEST_TIMEOUT"
          ? 504
          : 500;

      return NextResponse.json(scanResult, { status: statusCode });
    }

    return NextResponse.json(scanResult, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        code: "UNKNOWN_ERROR",
        error: "INTERNAL_ERROR",
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
