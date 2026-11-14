import type { MealType } from "@/types/food-log";
import type { ConfidenceLevel } from "@/types/food-scan";

export interface VoiceParsedFoodCandidate {
  id: string;
  food_name: string;
  alternative_names?: string[];
  portion_grams: number;
  serving_description: string;
  is_catalogue_match: boolean;
  matched_food_id: string | null;
  matched_food_name: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number | null;
  confidence: ConfidenceLevel;
  confidence_score: number;
  notes: string | null;
  selected_for_saving: boolean;
  nutrition_per_100g?: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fibre: number | null;
  };
}

export interface VoiceLogParseRequest {
  transcript: string;
  meal_type?: MealType;
  date?: string;
}

export interface VoiceLogParseResponse {
  success: boolean;
  transcript: string;
  meal_type: MealType;
  items: VoiceParsedFoodCandidate[];
  raw_interpretation?: string;
  code?: string;
  error?: string;
  message?: string;
}

export interface VoiceRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  permissionDenied: boolean;
}
