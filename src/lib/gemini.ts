import { validateAndSanitizeFoodScan } from "@/lib/food-scan-validator";
import type {
  FoodScanEstimate,
  FoodScanApiResponse,
  ScanErrorCode,
} from "@/types/food-scan";

const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "gemini-flash-lite-latest";
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const FOOD_VISION_PROMPT = `You are LocalFit's AI Nutrition & Food Vision Specialist.
Analyze the provided food photograph and identify all distinct food items present on the plate or meal.

Be culturally aware of Indian, Coastal Karnataka (e.g. Bhatkal Biryani, Neer Dosa, Pomfret Curry, Fish Curry, Roti, Dal, Rice, Sukka), Middle Eastern, and global cuisines.

CRITICAL INSTRUCTIONS:
1. If the image does NOT contain food (e.g. empty plates, people, pets, random objects, text, landscape), return:
   {
     "is_food_detected": false,
     "meal_summary": "No food detected",
     "items": [],
     "uncertainty_notes": "No recognizable food items could be detected in this photo."
   }
2. MULTI-ITEM MEAL DETECTION:
   - Identify each distinct food component on the plate/tray separately in the "items" array (e.g. Rice, Dal, Vegetables, Protein).
   - If a single dish is present, "items" should contain that 1 item.
3. ESTIMATES & LIMITATIONS:
   - Provide realistic portion weight estimates in grams based on standard plate/bowl proportions.
   - You CANNOT visually measure hidden cooking oils, ghee, added sugars, or salt. Acknowledge this limitation in "notes".
   - Set confidence to "high", "medium", or "low" based on visual clarity and certainty of dish identification.
4. Output strictly valid JSON conforming to the schema below.

REQUIRED JSON OUTPUT FORMAT:
{
  "is_food_detected": true,
  "meal_summary": "Short overview of meal (e.g. Neer Dosa with Coconut Chutney)",
  "items": [
    {
      "food_name": "Standard or culinary name of the item",
      "alternative_names": ["Local dialect name", "Common alternative name"],
      "category": "e.g. Grains & Breads, Curries & Stews, Seafood, Meat & Poultry, Vegetables, Dairy, Snacks",
      "portion_grams": 150,
      "calories": 200,
      "protein_g": 5.5,
      "carbs_g": 35.0,
      "fat_g": 2.5,
      "fibre_g": 1.5,
      "confidence": "high",
      "notes": "Observation notes, preparation details or uncertainty"
    }
  ],
  "food_name": "Primary dish name",
  "cooking_method": "e.g. Steamed, Boiled, Griddled, Fried",
  "estimated_weight_g": 150,
  "estimated_calories": 200,
  "estimated_protein": 5.5,
  "estimated_carbohydrates": 35.0,
  "estimated_fat": 2.5,
  "estimated_fibre": 1.5,
  "confidence": 90,
  "uncertainty_notes": "Visual portion approximation notes"
}`;

interface GeminiApiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Strips markdown code blocks and extracts raw JSON.
 */
export function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Server-side Gemini Food Image Scanner.
 * Strictly uses server-side environment variables and never exposes credentials.
 */
export async function analyzeFoodImageWithGemini(params: {
  imageBase64: string;
  mimeType: string;
}): Promise<FoodScanApiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0 || apiKey === "your_gemini_api_key_here") {
    return {
      success: false,
      code: "API_KEY_MISSING",
      error: "GEMINI_API_KEY_NOT_CONFIGURED",
      message:
        "The Gemini AI API key is not configured. Please set GEMINI_API_KEY in .env.local on the server.",
    };
  }

  // Validate incoming base64
  let cleanBase64 = params.imageBase64.trim();
  if (cleanBase64.includes(";base64,")) {
    cleanBase64 = cleanBase64.split(";base64,")[1];
  }

  if (!cleanBase64) {
    return {
      success: false,
      code: "INVALID_IMAGE",
      error: "MISSING_IMAGE_DATA",
      message: "No image content provided for analysis.",
    };
  }

  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const mimeType = validMimes.includes(params.mimeType) ? params.mimeType : "image/jpeg";

  // Try Primary Model first, with graceful fallback to Fallback Model
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: { code: ScanErrorCode; error: string; message: string } | null = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `${API_BASE_URL}/${modelName}:generateContent?key=${apiKey}`;
      const requestPayload = {
        contents: [
          {
            parts: [
              { text: FOOD_VISION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GeminiApiErrorResponse;
        const status = response.status;
        const errorMsg = errorData.error?.message || response.statusText;

        if (status === 429) {
          return {
            success: false,
            code: "QUOTA_EXCEEDED",
            error: "RATE_LIMIT_EXCEEDED",
            message:
              "Gemini AI scanning quota limit reached. Please wait a minute or enter food details manually.",
          };
        }

        if (status === 404 || errorMsg.includes("not found")) {
          lastError = {
            code: "MODEL_ERROR",
            error: "MODEL_NOT_FOUND",
            message: `Model ${modelName} not available.`,
          };
          continue;
        }

        if (status === 400) {
          return {
            success: false,
            code: "INVALID_IMAGE",
            error: "BAD_REQUEST",
            message: "The submitted image was rejected by Gemini vision service.",
          };
        }

        lastError = {
          code: "MODEL_ERROR",
          error: `HTTP_${status}`,
          message: "Gemini AI service returned an error. Please try again.",
        };
        continue;
      }

      // Successful HTTP response
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastError = {
          code: "PARSE_ERROR",
          error: "EMPTY_MODEL_RESPONSE",
          message: "No analysis text returned from Gemini vision.",
        };
        continue;
      }

      const jsonString = cleanJsonOutput(rawText);
      let parsedOutput: unknown;
      try {
        parsedOutput = JSON.parse(jsonString);
      } catch {
        lastError = {
          code: "PARSE_ERROR",
          error: "INVALID_JSON",
          message: "Could not parse structured food response from AI model.",
        };
        continue;
      }

      // Sanitize and validate nutrition physics and database matches
      const estimate: FoodScanEstimate = validateAndSanitizeFoodScan(parsedOutput);

      if (!estimate.is_food_detected || estimate.items.length === 0) {
        return {
          success: false,
          code: "NO_FOOD_DETECTED",
          error: "NO_FOOD_IDENTIFIED",
          message:
            estimate.uncertainty_notes ||
            "No recognizable food was found in this photo. Please retake photo with better lighting or enter manually.",
        };
      }

      return {
        success: true,
        data: estimate,
        model: modelName,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        lastError = {
          code: "MODEL_ERROR",
          error: "REQUEST_TIMEOUT",
          message: "Gemini vision analysis timed out. Please try again with a compressed image.",
        };
      } else {
        lastError = {
          code: "UNKNOWN_ERROR",
          error: "NETWORK_ERROR",
          message: "Could not connect to Gemini vision service.",
        };
      }
    }
  }

  // Return last error after all model fallbacks
  return {
    success: false,
    code: lastError?.code || "UNKNOWN_ERROR",
    error: lastError?.error || "SCAN_FAILED",
    message: lastError?.message || "Could not complete image analysis. Please try again.",
  };
}
