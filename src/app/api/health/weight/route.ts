import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateWeightLogInput } from "@/lib/health-validator";
import { calculateWeightChange } from "@/lib/health-calculator";
import type { WeightLog } from "@/types/health-tracking";

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
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 100 : rawLimit));

    let query = supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq("logged_date", date);
    } else if (startDate && endDate) {
      query = query.gte("logged_date", startDate).lte("logged_date", endDate);
    } else if (startDate) {
      query = query.gte("logged_date", startDate);
    } else if (endDate) {
      query = query.lte("logged_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const weights = (data || []) as WeightLog[];
    const latestWeight = weights.length > 0 ? weights[0] : null;
    const previousWeight = weights.length > 1 ? weights[1] : null;
    const weightChange =
      latestWeight && previousWeight
        ? calculateWeightChange(latestWeight.weight_kg, previousWeight.weight_kg)
        : null;

    return NextResponse.json({
      weights,
      count: weights.length,
      latestWeight,
      weightChange,
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

    const validation = validateWeightLogInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Always derive user_id securely from the verified session, discarding any client user_id
    const { data: inserted, error: insertError } = await supabase
      .from("weight_logs")
      .insert({
        user_id: user.id,
        weight_kg: validation.data.weight_kg,
        logged_date: validation.data.logged_date,
        notes: validation.data.notes,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ weight: inserted as WeightLog }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
