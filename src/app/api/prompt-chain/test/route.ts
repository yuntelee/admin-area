import { NextResponse } from "next/server";

import { requireApiSuperadmin } from "@/lib/admin/api-auth";
import { generateFlavorCaptionsViaApi } from "@/lib/prompt-chain/generate";

export async function POST(request: Request) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.accessToken) {
    return NextResponse.json(
      {
        error: {
          code: "ACCESS_TOKEN_UNAVAILABLE",
          message: "A valid JWT access token is required to call the caption pipeline.",
        },
      },
      { status: 401 },
    );
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

  const imageId = String(body.imageId ?? "").trim();
  const flavorId = String(body.flavorId ?? "").trim();

  if (!imageId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "imageId is required." } },
      { status: 422 },
    );
  }

  try {
    const generated = await generateFlavorCaptionsViaApi({
      accessToken: auth.accessToken,
      imageId,
      flavorId: flavorId || undefined,
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
