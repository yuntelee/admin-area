import { NextResponse } from "next/server";

import { getResourceByKey } from "@/lib/admin/resources";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireApiSuperadmin } from "@/lib/admin/api-auth";
import { validatePayload } from "@/lib/admin/validation";

type Context = {
  params: Promise<{ resource: string; id: string }>;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { resource: resourceKey, id } = await context.params;
  const resource = getResourceByKey(resourceKey);

  if (!resource) {
    return jsonError(404, "NOT_FOUND", "Unknown admin resource.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from(resource.table).select("*").eq("id", id).maybeSingle();

  if (error) {
    return jsonError(400, "QUERY_ERROR", error.message);
  }

  if (!data) {
    return jsonError(404, "NOT_FOUND", "Record not found.");
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { resource: resourceKey, id } = await context.params;
  const resource = getResourceByKey(resourceKey);

  if (!resource || (resource.mode !== "crud" && resource.mode !== "read-update" && resource.mode !== "images-crud")) {
    return jsonError(405, "METHOD_NOT_ALLOWED", "Resource is not updatable.");
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, "INVALID_JSON", "Body must be valid JSON object.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError(422, "INVALID_PAYLOAD", "Body must be a JSON object.");
  }

  try {
    validatePayload(resource.key, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed.";
    return jsonError(422, "VALIDATION_ERROR", message);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(resource.table)
    .update(payload)
    .eq("id", id)
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return jsonError(400, "UPDATE_ERROR", error.message);
  }

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { resource: resourceKey, id } = await context.params;
  const resource = getResourceByKey(resourceKey);

  if (!resource || (resource.mode !== "crud" && resource.mode !== "images-crud")) {
    return jsonError(405, "METHOD_NOT_ALLOWED", "Resource is not deletable.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from(resource.table).delete().eq("id", id);

  if (error) {
    return jsonError(400, "DELETE_ERROR", error.message);
  }

  return NextResponse.json({ data: { id, deleted: true } });
}
