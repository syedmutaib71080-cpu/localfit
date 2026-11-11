import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_FOOD_DATABASE } from "@/lib/food-data";
import {
  aggregateDailyTotals,
  calculateFoodNutrients,
  validateFoodLogInput,
} from "@/lib/nutrition-calculator";
import type { FoodLogEntry } from "@/types/nutrition-tracking";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const mealType = searchParams.get("meal_type")?.trim().toLowerCase();
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 100 : rawLimit));

    let query = supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq("consumption_date", date);
    } else if (startDate && endDate) {
      query = query
        .gte("consumption_date", startDate)
        .lte("consumption_date", endDate);
    }

    if (mealType && ["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
      query = query.eq("meal_type", mealType);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({
          logs: [],
          totals: date ? aggregateDailyTotals(date, []) : null,
          count: 0,
          pendingMigration: true,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = (data || []) as FoodLogEntry[];
    const totals = date ? aggregateDailyTotals(date, logs) : null;

    return NextResponse.json({
      logs,
      totals,
      count: logs.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = validateFoodLogInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const input = validation.data;

    // Resolve nutrition per 100g from catalogue or validated input
    let per100g = {
      calories_per_100g: input.calories_per_100g,
      protein_per_100g: input.protein_per_100g,
      carbohydrates_per_100g: input.carbohydrates_per_100g,
      fat_per_100g: input.fat_per_100g,
      fibre_per_100g: input.fibre_per_100g,
    };
    let foodName = input.food_name;
    let servingName = input.serving_name;

    if (input.food_id) {
      // Check database first
      const { data: dbFood } = await supabase
        .from("foods")
        .select("*")
        .eq("id", input.food_id)
        .maybeSingle();

      if (dbFood) {
        per100g = {
          calories_per_100g: dbFood.calories_per_100g,
          protein_per_100g: dbFood.protein_per_100g,
          carbohydrates_per_100g: dbFood.carbohydrates_per_100g,
          fat_per_100g: dbFood.fat_per_100g,
          fibre_per_100g: dbFood.fibre_per_100g,
        };
        foodName = dbFood.name;
        if (!servingName && dbFood.serving_name) {
          servingName = dbFood.serving_name;
        }
      } else {
        // Fallback to static verified catalogue
        const staticFood = VERIFIED_FOOD_DATABASE.find(
          (f) => f.id === input.food_id
        );
        if (staticFood) {
          per100g = {
            calories_per_100g: staticFood.calories_per_100g,
            protein_per_100g: staticFood.protein_per_100g,
            carbohydrates_per_100g: staticFood.carbohydrates_per_100g,
            fat_per_100g: staticFood.fat_per_100g,
            fibre_per_100g: staticFood.fibre_per_100g,
          };
          foodName = staticFood.name;
          if (!servingName && staticFood.serving_name) {
            servingName = staticFood.serving_name;
          }
        }
      }
    }

    // Server-side calculation strictly ignores any client-supplied calculated values
    const calculated = calculateFoodNutrients(per100g, input.quantity_g);

    // Build the secure food log entry with authenticated user_id
    const logPayload = {
      user_id: user.id, // Strictly server session user
      food_id: input.food_id,
      food_name: foodName,
      meal_type: input.meal_type,
      quantity_g: input.quantity_g,
      serving_name: servingName,
      calories: calculated.calories,
      protein: calculated.protein,
      carbohydrates: calculated.carbohydrates,
      fat: calculated.fat,
      fibre: calculated.fibre,
      consumption_date: input.consumption_date,
      logged_at: input.logged_at,
      notes: input.notes,
    };

    const { data: createdLog, error: insertError } = await supabase
      .from("food_logs")
      .insert(logPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ log: createdLog }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
