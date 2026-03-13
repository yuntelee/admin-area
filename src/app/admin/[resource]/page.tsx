import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createGenericRecord,
  createOrUpdateImageRecord,
  deleteGenericRecord,
  updateGenericRecord,
} from "@/app/admin/actions";
import { getResourceByKey } from "@/lib/admin/resources";
import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ResourcePageProps = {
  params: Promise<{ resource: string }>;
  searchParams?: Promise<{
    q?: string;
    page?: string;
    success?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 25;

function encodeSearchTerm(value: string) {
  return value.replaceAll(",", " ");
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getColumnKeys(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return [] as string[];
  }

  const keys = Object.keys(rows[0]);
  return keys.slice(0, 10);
}

function getDefaultPayload(row: Record<string, unknown>) {
  const payload = { ...row };
  delete payload.id;
  return JSON.stringify(payload, null, 2);
}

export default async function AdminResourcePage({ params, searchParams }: ResourcePageProps) {
  await requireSuperadmin();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const resource = getResourceByKey(resolvedParams.resource);
  if (!resource) {
    notFound();
  }

  const query = (resolvedSearchParams?.q || "").trim();
  const page = Math.max(1, Number(resolvedSearchParams?.page || "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createSupabaseAdminClient();
  let supabaseQuery = admin.from(resource.table).select("*", { count: "exact" }).range(from, to);

  if (resource.orderBy) {
    supabaseQuery = supabaseQuery.order(resource.orderBy, {
      ascending: resource.orderAscending ?? false,
    });
  }

  if (query && resource.searchColumns && resource.searchColumns.length > 0) {
    const searchExpr = resource.searchColumns
      .map((column) => `${column}.ilike.%${encodeSearchTerm(query)}%`)
      .join(",");
    supabaseQuery = supabaseQuery.or(searchExpr);
  }

  let { data, count, error } = await supabaseQuery;

  // Fallback query when ordering/search columns differ between environments.
  if (error) {
    let fallbackQuery = admin.from(resource.table).select("*", { count: "exact" }).range(from, to);
    if (query && resource.searchColumns && resource.searchColumns.length > 0) {
      const searchExpr = resource.searchColumns
        .map((column) => `${column}.ilike.%${encodeSearchTerm(query)}%`)
        .join(",");
      fallbackQuery = fallbackQuery.or(searchExpr);
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    count = fallbackResult.count;
    error = fallbackResult.error;
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const columns = getColumnKeys(rows);
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resourcePath = `/admin/${resource.key}`;
  const paginationBase = query
    ? `${resourcePath}?q=${encodeURIComponent(query)}`
    : resourcePath;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-400">{resource.section}</p>
        <h1 className="text-3xl font-bold">{resource.label}</h1>
        <p className="text-sm text-slate-400">{resource.description}</p>
      </header>

      {resolvedSearchParams?.success ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {resolvedSearchParams.success}
        </p>
      ) : null}

      {resolvedSearchParams?.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <form action={resourcePath} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            Search
          </button>
          <Link
            href={resourcePath}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-white/10"
          >
            Reset
          </Link>
        </div>
      </form>

      {resource.mode === "crud" && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Create Record</h2>
          <p className="mt-1 text-xs text-slate-400">Provide JSON payload.</p>
          <form action={createGenericRecord} className="mt-3 space-y-3">
            <input type="hidden" name="resourceKey" value={resource.key} />
            <input type="hidden" name="returnPath" value={resourcePath} />
            <textarea
              name="payload"
              rows={8}
              defaultValue={JSON.stringify(resource.samplePayload ?? { name: "example" }, null, 2)}
              className="w-full rounded-lg border border-white/15 bg-slate-900 p-3 font-mono text-xs text-slate-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Create
            </button>
          </form>
        </section>
      )}

      {resource.mode === "images-crud" && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Create Image</h2>
          <p className="mt-1 text-xs text-slate-400">Upload a file or provide a URL.</p>
          <form action={createOrUpdateImageRecord} className="mt-3 grid gap-3 lg:grid-cols-2">
            <input type="hidden" name="mode" value="create" />
            <input type="hidden" name="returnPath" value={resourcePath} />

            <label className="space-y-1 text-xs text-slate-300">
              URL
              <input
                type="text"
                name="url"
                placeholder="https://..."
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-300">
              Upload File
              <input
                type="file"
                name="image_file"
                accept="image/*"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-300">
              Image Description
              <input
                type="text"
                name="image_description"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="space-y-1 text-xs text-slate-300">
              Additional Context
              <input
                type="text"
                name="additional_context"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_public" className="h-4 w-4" />
              Public
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_common_use" className="h-4 w-4" />
              Common Use
            </label>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Create Image
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Records ({rows.length}/{totalCount})
          </h2>
          <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error.message}
          </p>
        ) : null}

        {!error && rows.length === 0 ? (
          <p className="text-sm text-slate-400">No records found.</p>
        ) : null}

        <div className="space-y-4">
          {rows.map((row, index) => {
            const rowId = String(row.id ?? index);
            const defaultPayload = getDefaultPayload(row);

            return (
              <article key={rowId} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500">
                        {columns.map((column) => (
                          <th key={column} className="px-2 py-2 font-medium uppercase tracking-wide">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {columns.map((column) => (
                          <td key={column} className="max-w-[300px] px-2 py-2 align-top text-slate-300">
                            <div className="line-clamp-4 break-words">{formatCellValue(row[column])}</div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {resource.mode === "crud" || resource.mode === "read-update" ? (
                  <form action={updateGenericRecord} className="mt-4 space-y-2">
                    <input type="hidden" name="resourceKey" value={resource.key} />
                    <input type="hidden" name="rowId" value={rowId} />
                    <input type="hidden" name="returnPath" value={resourcePath} />
                    <textarea
                      name="payload"
                      rows={6}
                      defaultValue={defaultPayload}
                      className="w-full rounded-lg border border-white/15 bg-slate-950 p-3 font-mono text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-sky-300/40 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
                    >
                      Update Record
                    </button>
                  </form>
                ) : null}

                {resource.mode === "images-crud" ? (
                  <form action={createOrUpdateImageRecord} className="mt-4 grid gap-3 lg:grid-cols-2">
                    <input type="hidden" name="mode" value="update" />
                    <input type="hidden" name="rowId" value={rowId} />
                    <input type="hidden" name="returnPath" value={resourcePath} />

                    <label className="space-y-1 text-xs text-slate-300">
                      URL
                      <input
                        type="text"
                        name="url"
                        defaultValue={String(row.url ?? "")}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-300">
                      Replace File
                      <input
                        type="file"
                        name="image_file"
                        accept="image/*"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-300">
                      Image Description
                      <input
                        type="text"
                        name="image_description"
                        defaultValue={String(row.image_description ?? "")}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-300">
                      Additional Context
                      <input
                        type="text"
                        name="additional_context"
                        defaultValue={String(row.additional_context ?? "")}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" name="is_public" defaultChecked={Boolean(row.is_public)} className="h-4 w-4" />
                      Public
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        name="is_common_use"
                        defaultChecked={Boolean(row.is_common_use)}
                        className="h-4 w-4"
                      />
                      Common Use
                    </label>

                    <div className="lg:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg border border-sky-300/40 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
                      >
                        Update Image
                      </button>
                    </div>
                  </form>
                ) : null}

                {resource.mode === "crud" || resource.mode === "images-crud" ? (
                  <form action={deleteGenericRecord} className="mt-3">
                    <input type="hidden" name="resourceKey" value={resource.key} />
                    <input type="hidden" name="rowId" value={rowId} />
                    <input type="hidden" name="returnPath" value={resourcePath} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                    >
                      Delete Record
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`${paginationBase}${paginationBase.includes("?") ? "&" : "?"}page=${Math.max(1, page - 1)}`}
            className={`rounded-lg border border-white/15 px-3 py-2 text-sm ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white/10"
            }`}
          >
            Previous
          </Link>

          <Link
            href={`${paginationBase}${paginationBase.includes("?") ? "&" : "?"}page=${Math.min(totalPages, page + 1)}`}
            className={`rounded-lg border border-white/15 px-3 py-2 text-sm ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-white/10"
            }`}
          >
            Next
          </Link>
        </div>
      </section>
    </section>
  );
}
