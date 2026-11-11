import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_FOOD_DATABASE } from "@/lib/food-data";
import type { FoodCatalogueItem } from "@/types/nutrition-tracking";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));

    let items: FoodCatalogueItem[] = [];

    // Attempt to query live Supabase database first
    try {
      const supabase = await createClient();
      let query = supabase
        .from("foods")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit);

      if (category) {
        query = query.eq("category", category);
      }

      if (q) {
        query = query.or(`name.ilike.%${q}%,local_name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        items = data as FoodCatalogueItem[];
      }
    } catch {
      // In offline or local test mode without live Supabase connection, fallback to verified static catalogue
    }

    // Fallback to static verified foods if database query returned no items or table is empty/unmigrated
    if (items.length === 0) {
      const staticMatches = VERIFIED_FOOD_DATABASE.filter((food) => {
        const matchesCategory = category ? food.category.toLowerCase() === category.toLowerCase() : true;
        const matchesQuery = q
          ? food.name.toLowerCase().includes(q) ||
            (food.local_name && food.local_name.toLowerCase().includes(q)) ||
            (food.description && food.description.toLowerCase().includes(q))
          : true;
        return matchesCategory && matchesQuery;
      }).slice(0, limit);

      items = staticMatches.map((food) => ({
        id: food.id,
        name: food.name,
        local_name: food.local_name || null,
        category: food.category,
        description: food.description || null,
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbohydrates_per_100g: food.carbohydrates_per_100g,
        fat_per_100g: food.fat_per_100g,
        fibre_per_100g: food.fibre_per_100g,
        serving_name: food.serving_name || null,
        serving_weight_g: food.serving_weight_g || null,
        region: food.region || null,
        source: food.source || null,
        confidence_level: food.confidence_level || "high",
        is_verified: food.is_verified,
      }));
    }

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to retrieve food items" },
      { status: 500 }
    );
  }
}
