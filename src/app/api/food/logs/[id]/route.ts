import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_FOOD_DATABASE } from "@/lib/food-data";
import {
  calculateFoodNutrients,
  validateFoodLogUpdate,
} from "@/lib/nutrition-calculator";
import type { FoodLogEntry } from "@/types/nutrition-tracking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Food log ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: log, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!log) {
      return NextResponse.json(
        { error: "Food log entry not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ log: log as FoodLogEntry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Food log ID is required" }, { status: 400 });
    }

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

    const validation = validateFoodLogUpdate(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updates = validation.data;

    // Fetch existing log to verify ownership and existing data for recalculations
    const { data: existing, error: fetchError } = await supabase
      .from("food_logs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Food log entry not found or unauthorized to update" },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, unknown> = {};

    if (updates.meal_type !== undefined) {
      updatePayload.meal_type = updates.meal_type;
    }
    if (updates.notes !== undefined) {
      updatePayload.notes = updates.notes;
    }
    if (updates.consumption_date !== undefined) {
      updatePayload.consumption_date = updates.consumption_date;
    }
    if (updates.logged_at !== undefined) {
      updatePayload.logged_at = updates.logged_at;
    }

    // Recalculate nutrients if quantity changed
    if (updates.quantity_g !== undefined && updates.quantity_g !== existing.quantity_g) {
      const newQuantity = updates.quantity_g;
      updatePayload.quantity_g = newQuantity;

      let per100g = {
        calories_per_100g: null as number | null,
        protein_per_100g: null as number | null,
        carbohydrates_per_100g: null as number | null,
        fat_per_100g: null as number | null,
        fibre_per_100g: null as number | null,
      };

      if (existing.food_id) {
        // Look up food catalogue entry
        const { data: dbFood } = await supabase
          .from("foods")
          .select("*")
          .eq("id", existing.food_id)
          .maybeSingle();

        if (dbFood) {
          per100g = {
            calories_per_100g: dbFood.calories_per_100g,
            protein_per_100g: dbFood.protein_per_100g,
            carbohydrates_per_100g: dbFood.carbohydrates_per_100g,
            fat_per_100g: dbFood.fat_per_100g,
            fibre_per_100g: dbFood.fibre_per_100g,
          };
        } else {
          const staticFood = VERIFIED_FOOD_DATABASE.find(
            (f) => f.id === existing.food_id
          );
          if (staticFood) {
            per100g = {
              calories_per_100g: staticFood.calories_per_100g,
              protein_per_100g: staticFood.protein_per_100g,
              carbohydrates_per_100g: staticFood.carbohydrates_per_100g,
              fat_per_100g: staticFood.fat_per_100g,
              fibre_per_100g: staticFood.fibre_per_100g,
            };
          }
        }
      } else if (existing.quantity_g > 0) {
        // Derive per-100g from existing values for custom manual foods
        const oldQty = existing.quantity_g;
        per100g = {
          calories_per_100g: existing.calories !== null ? (existing.calories / oldQty) * 100 : null,
          protein_per_100g: existing.protein !== null ? (existing.protein / oldQty) * 100 : null,
          carbohydrates_per_100g: existing.carbohydrates !== null ? (existing.carbohydrates / oldQty) * 100 : null,
          fat_per_100g: existing.fat !== null ? (existing.fat / oldQty) * 100 : null,
          fibre_per_100g: existing.fibre !== null ? (existing.fibre / oldQty) * 100 : null,
        };
      }

      const recalculated = calculateFoodNutrients(per100g, newQuantity);
      updatePayload.calories = recalculated.calories;
      updatePayload.protein = recalculated.protein;
      updatePayload.carbohydrates = recalculated.carbohydrates;
      updatePayload.fat = recalculated.fat;
      updatePayload.fibre = recalculated.fibre;
    }

    const { data: updated, error: updateError } = await supabase
      .from("food_logs")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ log: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Food log ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership before deleting
    const { data: existing, error: checkError } = await supabase
      .from("food_logs")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Food log entry not found or unauthorized to delete" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("food_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Food log entry deleted successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
