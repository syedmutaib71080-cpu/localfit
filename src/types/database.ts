export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Gender = "male" | "female" | "non-binary" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active";

export type FitnessGoal =
  | "lose_weight"
  | "maintain_weight"
  | "gain_weight"
  | "improve_fitness";

export type PreferredUnit = "metric" | "imperial";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          age: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          gender: string | null;
          activity_level: ActivityLevel | null;
          fitness_goal: FitnessGoal | null;
          daily_calorie_goal: number | null;
          daily_protein_goal: number | null;
          preferred_unit: PreferredUnit;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          age?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          gender?: string | null;
          activity_level?: ActivityLevel | null;
          fitness_goal?: FitnessGoal | null;
          daily_calorie_goal?: number | null;
          daily_protein_goal?: number | null;
          preferred_unit?: PreferredUnit;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          age?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          gender?: string | null;
          activity_level?: ActivityLevel | null;
          fitness_goal?: FitnessGoal | null;
          daily_calorie_goal?: number | null;
          daily_protein_goal?: number | null;
          preferred_unit?: PreferredUnit;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_workouts: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          activity_type: "walking" | "running" | "cycling";
          start_time: string;
          finish_time: string;
          duration_seconds: number;
          distance_meters: number;
          avg_pace_or_speed: number;
          estimated_calories: number | null;
          step_count: number | null;
          route_data: Json | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token: string;
          activity_type: "walking" | "running" | "cycling";
          start_time: string;
          finish_time: string;
          duration_seconds: number;
          distance_meters: number;
          avg_pace_or_speed: number;
          estimated_calories?: number | null;
          step_count?: number | null;
          route_data?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          activity_type?: "walking" | "running" | "cycling";
          start_time?: string;
          finish_time?: string;
          duration_seconds?: number;
          distance_meters?: number;
          avg_pace_or_speed?: number;
          estimated_calories?: number | null;
          step_count?: number | null;
          route_data?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_steps: {
        Row: {
          id: string;
          user_id: string;
          step_date: string;
          steps: number;
          source: "manual" | "device_sensor" | "workout_estimate";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          step_date: string;
          steps: number;
          source?: "manual" | "device_sensor" | "workout_estimate";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          step_date?: string;
          steps?: number;
          source?: "manual" | "device_sensor" | "workout_estimate";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          name: string;
          local_name: string | null;
          category: string;
          description: string | null;
          calories_per_100g: number | null;
          protein_per_100g: number | null;
          carbohydrates_per_100g: number | null;
          fat_per_100g: number | null;
          fibre_per_100g: number | null;
          serving_name: string | null;
          serving_weight_g: number | null;
          region: string | null;
          source: string | null;
          confidence_level: "high" | "medium" | "low" | "estimated";
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          local_name?: string | null;
          category: string;
          description?: string | null;
          calories_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbohydrates_per_100g?: number | null;
          fat_per_100g?: number | null;
          fibre_per_100g?: number | null;
          serving_name?: string | null;
          serving_weight_g?: number | null;
          region?: string | null;
          source?: string | null;
          confidence_level?: "high" | "medium" | "low" | "estimated";
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          local_name?: string | null;
          category?: string;
          description?: string | null;
          calories_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbohydrates_per_100g?: number | null;
          fat_per_100g?: number | null;
          fibre_per_100g?: number | null;
          serving_name?: string | null;
          serving_weight_g?: number | null;
          region?: string | null;
          source?: string | null;
          confidence_level?: "high" | "medium" | "low" | "estimated";
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string | null;
          food_name: string;
          meal_type: string;
          quantity_g: number;
          serving_name: string | null;
          calories: number | null;
          protein: number | null;
          carbohydrates: number | null;
          fat: number | null;
          fibre: number | null;
          consumption_date?: string;
          logged_at: string;
          notes?: string | null;
          is_ai_estimate?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_id?: string | null;
          food_name: string;
          meal_type: string;
          quantity_g: number;
          serving_name?: string | null;
          calories?: number | null;
          protein?: number | null;
          carbohydrates?: number | null;
          fat?: number | null;
          fibre?: number | null;
          consumption_date?: string;
          logged_at?: string;
          notes?: string | null;
          is_ai_estimate?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          food_id?: string | null;
          food_name?: string;
          meal_type?: string;
          quantity_g?: number;
          serving_name?: string | null;
          calories?: number | null;
          protein?: number | null;
          carbohydrates?: number | null;
          fat?: number | null;
          fibre?: number | null;
          consumption_date?: string;
          logged_at?: string;
          notes?: string | null;
          is_ai_estimate?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
