import { NextResponse } from "next/server";

import { requireApiSuperadmin } from "@/lib/admin/api-auth";
import { generateFlavorCaptionsViaApi } from "@/lib/prompt-chain/generate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STEP_ORDER_CANDIDATES = ["step_order", "step_number", "order_index", "sequence", "position"];

type StepRecord = Record<string, unknown>;

function extractStepOrder(step: StepRecord, index: number) {
  for (const key of STEP_ORDER_CANDIDATES) {
    const value = step[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return index + 1;
}

async function loadFlavorSteps(admin: ReturnType<typeof createSupabaseAdminClient>, flavorId: string) {
  for (const orderColumn of STEP_ORDER_CANDIDATES) {
    const { data, error } = await admin
      .from("humor_flavor_steps")
      .select("*")
      .eq("humor_flavor_id", flavorId)
      .order(orderColumn, { ascending: true });

    if (!error) {
      return (data ?? []) as StepRecord[];
    }
  }

  const { data } = await admin
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId);

  return ((data ?? []) as StepRecord[]).sort((a, b) => {
    const aOrder = extractStepOrder(a, 0);
    const bOrder = extractStepOrder(b, 0);
    return aOrder - bOrder;
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 422 },
    );
  }

  const flavorId = String(body.flavorId ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();
  const imageDescription = String(body.imageDescription ?? "").trim();

  if (!flavorId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "flavorId is required." } },
      { status: 422 },
    );
  }

  if (!imageUrl) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "imageUrl is required." } },
      { status: 422 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: flavor, error: flavorError } = await admin
    .from("humor_flavors")
    .select("*")
    .eq("id", flavorId)
    .maybeSingle();

  if (flavorError || !flavor) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Humor flavor not found." } },
      { status: 404 },
    );
  }

  try {
    const steps = await loadFlavorSteps(admin, flavorId);
    const generated = await generateFlavorCaptionsViaApi({
      flavorId,
      imageUrl,
      imageDescription: imageDescription || undefined,
      flavor,
      steps,
    });

    return NextResponse.json({
      data: {
        captions: generated.captions,
        endpoint: generated.endpoint,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Caption generation failed.";
    return NextResponse.json(
      { error: { code: "GENERATION_FAILED", message } },
      { status: 502 },
    );
  }
}
