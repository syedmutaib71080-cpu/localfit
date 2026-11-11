import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRouteData } from "@/lib/route-validator";
import { validateWorkoutInput } from "@/lib/workout-validator";
import { calculateWorkoutCalories } from "@/lib/calorie-calculator";
import type { CreateWorkoutInput } from "@/types/activity";

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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const type = searchParams.get("type");

    let query = supabase
      .from("activity_workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(limit);

    if (type && ["walking", "running", "cycling"].includes(type)) {
      query = query.eq("activity_type", type);
    }

    const { data, error } = await query;

    if (error) {
      // If table is not yet migrated, return empty list gracefully
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({ workouts: [], pendingMigration: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workouts: data || [] });
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

    const body = (await req.json()) as Partial<CreateWorkoutInput>;

    // 1. Strict Server-Side Workout Input Validation
    const validation = validateWorkoutInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const validatedData = validation.data;

    // 2. Server-side Route Validation (per Requirement #4)
    const routeValidation = validateRouteData(body.route_data);
    if (!routeValidation.valid) {
      return NextResponse.json({ error: routeValidation.error }, { status: 400 });
    }

    // 3. Duplicate Prevention Check (per Requirement #1)
    const { data: existingWorkout } = await supabase
      .from("activity_workouts")
      .select("id")
      .eq("session_token", validatedData.session_token)
      .maybeSingle();

    if (existingWorkout) {
      return NextResponse.json(
        { error: "Workout with this session_token has already been saved.", duplicate: true },
        { status: 409 }
      );
    }

    // 4. Fetch User Weight from Profile (never assumed 70kg, per Requirement #1)
    const { data: profile } = await supabase
      .from("profiles")
      .select("weight_kg")
      .eq("id", user.id)
      .maybeSingle();

    const userWeightKg = profile?.weight_kg ? Number(profile.weight_kg) : null;
    const calorieResult = calculateWorkoutCalories(
      validatedData.activity_type,
      validatedData.duration_seconds,
      userWeightKg,
      validatedData.distance_meters
    );

    // 5. Insert into Database
    const { data: inserted, error: insertError } = await supabase
      .from("activity_workouts")
      .insert({
        user_id: user.id,
        session_token: validatedData.session_token,
        activity_type: validatedData.activity_type,
        start_time: validatedData.start_time,
        finish_time: validatedData.finish_time,
        duration_seconds: validatedData.duration_seconds,
        distance_meters: validatedData.distance_meters,
        avg_pace_or_speed: validatedData.avg_pace_or_speed,
        estimated_calories: calorieResult.estimatedCalories,
        step_count: validatedData.step_count,
        route_data: (routeValidation.sanitizedData as unknown) || null,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation on session_token
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Duplicate workout submission prevented by session_token constraint.", duplicate: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      workout: inserted,
      calorieCalculationNotice: calorieResult.explanation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
