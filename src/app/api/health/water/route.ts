import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateWaterLogInput } from "@/lib/health-validator";
import { aggregateDailyWater } from "@/lib/health-calculator";
import type { WaterLog } from "@/types/health-tracking";

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
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("intake_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq("intake_date", date);
    } else if (startDate && endDate) {
      query = query.gte("intake_date", startDate).lte("intake_date", endDate);
    } else if (startDate) {
      query = query.gte("intake_date", startDate);
    } else if (endDate) {
      query = query.lte("intake_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = (data || []) as WaterLog[];

    // If specific date requested, fetch profile water goal and compute summary
    if (date) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_water_goal_ml")
        .eq("id", user.id)
        .maybeSingle();

      const summary = aggregateDailyWater(logs, date, profile?.daily_water_goal_ml);

      return NextResponse.json({
        logs,
        summary,
        count: logs.length,
      });
    }

    return NextResponse.json({
      logs,
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

    const validation = validateWaterLogInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("water_logs")
      .insert({
        user_id: user.id,
        amount_ml: validation.data.amount_ml,
        intake_date: validation.data.intake_date,
        notes: validation.data.notes,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ log: inserted as WaterLog }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
