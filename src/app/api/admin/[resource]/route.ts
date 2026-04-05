import { NextResponse } from "next/server";

import { getResourceByKey } from "@/lib/admin/resources";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireApiSuperadmin } from "@/lib/admin/api-auth";
import { validatePayload } from "@/lib/admin/validation";

type Context = {
  params: Promise<{ resource: string }>;
};

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function safeSearch(value: string) {
  return value.replaceAll(",", " ");
}

export async function GET(request: Request, context: Context) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { resource: resourceKey } = await context.params;
  const resource = getResourceByKey(resourceKey);

  if (!resource) {
    return jsonError(404, "NOT_FOUND", "Unknown admin resource.");
  }

  const requestUrl = new URL(request.url);
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") ?? "1") || 1);
  const requestedLimit = Number(requestUrl.searchParams.get("limit") ?? PAGE_SIZE_DEFAULT);
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, requestedLimit || PAGE_SIZE_DEFAULT));
  const q = (requestUrl.searchParams.get("q") ?? "").trim();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createSupabaseAdminClient();
  let query = admin.from(resource.table).select("*", { count: "exact" }).range(from, to);

  if (resource.orderBy) {
    query = query.order(resource.orderBy, {
      ascending: resource.orderAscending ?? false,
    });
  }

  if (q && resource.searchColumns && resource.searchColumns.length > 0) {
    const searchExpr = resource.searchColumns
      .map((column) => `${column}.ilike.%${safeSearch(q)}%`)
      .join(",");
    query = query.or(searchExpr);
  }

  let { data, error, count } = await query;

  if (error) {
    let fallback = admin.from(resource.table).select("*", { count: "exact" }).range(from, to);
    if (q && resource.searchColumns && resource.searchColumns.length > 0) {
      const searchExpr = resource.searchColumns
        .map((column) => `${column}.ilike.%${safeSearch(q)}%`)
        .join(",");
      fallback = fallback.or(searchExpr);
    }

    const fallbackRes = await fallback;
    data = fallbackRes.data;
    error = fallbackRes.error;
    count = fallbackRes.count;
  }

  if (error) {
    return jsonError(400, "QUERY_ERROR", error.message);
  }

  return NextResponse.json({
    data: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
    },
  });
}

export async function POST(request: Request, context: Context) {
  const auth = await requireApiSuperadmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { resource: resourceKey } = await context.params;
  const resource = getResourceByKey(resourceKey);

  if (!resource || (resource.mode !== "crud" && resource.mode !== "images-crud")) {
    return jsonError(405, "METHOD_NOT_ALLOWED", "Resource is not createable.");
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

  if (resource.key === "terms") {
    payload.created_by_user_id = auth.userId;
    payload.modified_by_user_id = auth.userId;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from(resource.table).insert(payload).select("*").limit(1).single();

  if (error) {
    return jsonError(400, "INSERT_ERROR", error.message);
  }

  return NextResponse.json({ data }, { status: 201 });
}
