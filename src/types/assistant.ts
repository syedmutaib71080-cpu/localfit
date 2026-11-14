export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MinimalNutritionContext {
  targetDate: string;
  isDiaryUnavailable?: boolean;
  hasLoggedMeals: boolean;
  caloriesLogged: number;
  proteinLogged: number;
  calorieGoal: number | null;
  proteinGoal: number | null;
  loggedFoods: Array<{
    name: string;
    mealType: string;
    portionGrams: number;
    calories: number;
    proteinGrams: number;
    isCatalogueMatch: boolean;
  }>;
}

export interface NutritionAssistantRequest {
  message: string;
  conversationHistory?: AssistantChatMessage[];
  timezone?: string;
  date?: string;
  includeUserContext?: boolean;
}

export interface NutritionAssistantResponse {
  success: boolean;
  message: string;
  isEmergency?: boolean;
  contextUsed?: {
    date: string;
    hasLoggedMeals: boolean;
    caloriesLogged: number;
    calorieGoal: number | null;
    proteinLogged: number;
    proteinGoal: number | null;
  } | null;
  suggestedQuestions: string[];
  disclaimer: string;
  code?: string;
  error?: string;
}
