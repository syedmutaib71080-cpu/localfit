import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateHealthGoalsUpdate } from "@/lib/health-validator";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes, daily_calorie_goal, daily_protein_goal")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      goals: {
        daily_water_goal_ml: profile?.daily_water_goal_ml ?? null,
        daily_sleep_goal_minutes: profile?.daily_sleep_goal_minutes ?? null,
        daily_calorie_goal: profile?.daily_calorie_goal ?? null,
        daily_protein_goal: profile?.daily_protein_goal ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const validation = validateHealthGoalsUpdate(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(validation.data)
      .eq("id", user.id)
      .select("daily_water_goal_ml, daily_sleep_goal_minutes, daily_calorie_goal, daily_protein_goal")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        goals: {
          daily_water_goal_ml: updated.daily_water_goal_ml ?? null,
          daily_sleep_goal_minutes: updated.daily_sleep_goal_minutes ?? null,
          daily_calorie_goal: updated.daily_calorie_goal ?? null,
          daily_protein_goal: updated.daily_protein_goal ?? null,
        },
        message: "Health goals updated successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
