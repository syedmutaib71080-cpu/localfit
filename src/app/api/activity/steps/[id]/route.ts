import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateStepInput } from "@/types/activity";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Step ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as UpdateStepInput;
    const updates: Record<string, unknown> = {};

    if (body.steps !== undefined) {
      const steps = Number(body.steps);
      if (isNaN(steps) || steps <= 0 || !Number.isInteger(steps)) {
        return NextResponse.json({ error: "Steps must be a positive whole number greater than 0." }, { status: 400 });
      }
      if (steps > 150000) {
        return NextResponse.json({ error: "Steps cannot exceed 150,000." }, { status: 400 });
      }
      updates.steps = steps;
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return NextResponse.json({ error: "Notes must be a string." }, { status: 400 });
      }
      if (body.notes && body.notes.trim().length > 2000) {
        return NextResponse.json({ error: "Notes cannot exceed 2,000 characters." }, { status: 400 });
      }
      updates.notes = body.notes ? body.notes.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("daily_steps")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Step entry not found or unauthorized to update" }, { status: 404 });
    }

    return NextResponse.json({ stepEntry: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Step ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error, count } = await supabase
      .from("daily_steps")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Step entry not found or unauthorized to delete" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
