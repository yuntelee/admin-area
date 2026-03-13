import Link from "next/link";

import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_RESOURCES } from "@/lib/admin/resources";

function formatCount(value: number | null) {
  return (value ?? 0).toLocaleString();
}

export default async function AdminOverviewPage() {
  await requireSuperadmin();
  const admin = createSupabaseAdminClient();

  const resourcesWithCounts = await Promise.all(
    ADMIN_RESOURCES.map(async (resource) => {
      const { count, error } = await admin
        .from(resource.table)
        .select("*", { count: "exact", head: true });

      return {
        ...resource,
        count: error ? null : count,
        error: error?.message,
      };
    }),
  );

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Superadmin-only control panel for users, humor systems, content, AI configuration, and access controls.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resourcesWithCounts.map((resource) => (
          <article key={resource.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-400">{resource.section}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{resource.label}</h2>
            <p className="mt-1 text-sm text-slate-400">{resource.description}</p>

            <p className="mt-4 text-3xl font-bold text-emerald-300">
              {resource.error ? "—" : formatCount(resource.count)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Rows in {resource.table}</p>

            {resource.error ? (
              <p className="mt-3 text-xs text-rose-300">{resource.error}</p>
            ) : null}

            <Link
              className="mt-4 inline-block rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
              href={`/admin/${resource.key}`}
            >
              Open {resource.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
