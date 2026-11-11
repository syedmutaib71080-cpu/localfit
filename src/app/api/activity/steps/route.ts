import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateStepInput } from "@/types/activity";

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
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("daily_steps")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (date) {
      query = query.eq("step_date", date);
    } else if (startDate && endDate) {
      query = query.gte("step_date", startDate).lte("step_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({ steps: [], pendingMigration: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ steps: data || [] });
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

    const body = (await req.json()) as Partial<CreateStepInput>;

    const steps = Number(body.steps);
    if (isNaN(steps) || steps <= 0 || !Number.isInteger(steps)) {
      return NextResponse.json({ error: "Steps must be a positive whole number greater than 0." }, { status: 400 });
    }

    if (steps > 150000) {
      return NextResponse.json({ error: "Step entry exceeds single-log physical maximum (150,000 steps)." }, { status: 400 });
    }

    const stepDate = body.step_date || new Date().toISOString().split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stepDate)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    const source = body.source || "manual";
    if (!["manual", "device_sensor", "workout_estimate"].includes(source)) {
      return NextResponse.json({ error: "Invalid step source." }, { status: 400 });
    }

    let notes: string | null = null;
    if (body.notes !== undefined && body.notes !== null) {
      if (typeof body.notes !== "string") {
        return NextResponse.json({ error: "Notes must be a string." }, { status: 400 });
      }
      const trimmed = body.notes.trim();
      if (trimmed.length > 2000) {
        return NextResponse.json({ error: "Notes cannot exceed 2,000 characters." }, { status: 400 });
      }
      notes = trimmed.length > 0 ? trimmed : null;
    }

    // Insert cumulative step record (additive, allows multiple entries per day)
    const { data: inserted, error: insertError } = await supabase
      .from("daily_steps")
      .insert({
        user_id: user.id,
        step_date: stepDate,
        steps,
        source,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ stepEntry: inserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
