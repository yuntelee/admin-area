import Link from "next/link";

import { requireSuperadmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_RESOURCES } from "@/lib/admin/resources";

type CaptionRow = {
  id: string | number;
  content: string | null;
  like_count: number | null;
};

type TopRatedCaption = {
  id: string;
  content: string;
  likeCount: number;
};

function formatCount(value: number | null) {
  return (value ?? 0).toLocaleString();
}

async function getExactCount(
  table: string,
  options?: {
    column?: string;
    gte?: string;
    eq?: { column: string; value: string | boolean | number };
  },
) {
  const admin = createSupabaseAdminClient();
  let query = admin.from(table).select("*", { count: "exact", head: true });

  if (options?.column && options?.gte) {
    query = query.gte(options.column, options.gte);
  }

  if (options?.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }

  const { count, error } = await query;
  if (error) {
    return null;
  }

  return count ?? 0;
}

async function getAverageCaptionLength() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("captions").select("content").limit(200);
  if (error || !data || data.length === 0) {
    return null;
  }

  const lengths = data
    .map((row) => String((row as { content?: unknown }).content ?? "").trim().length)
    .filter((length) => length > 0);

  if (lengths.length === 0) {
    return null;
  }

  const avg = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  return Math.round(avg);
}

async function getCaptionVotesLast7DaysCount() {
  const admin = createSupabaseAdminClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const createdAtColumnCandidates = ["created_datetime_utc", "created_at"];

  for (const column of createdAtColumnCandidates) {
    const { count, error } = await admin
      .from("caption_votes")
      .select("*", { count: "exact", head: true })
      .gte(column, sevenDaysAgoIso);

    if (!error) {
      return count ?? 0;
    }
  }

  return null;
}

async function getTopRatedCaptions(limit = 5): Promise<TopRatedCaption[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("captions")
    .select("id, content, like_count")
    .order("like_count", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as CaptionRow[])
    .map((row) => ({
      id: String(row.id),
      content: String(row.content ?? "").trim(),
      likeCount: Number(row.like_count ?? 0),
    }))
    .filter((row) => row.content.length > 0)
    .slice(0, limit);
}

async function getRatedCaptionsCount() {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("captions")
    .select("*", { count: "exact", head: true })
    .gt("like_count", 0);

  if (error) {
    return null;
  }

  return count ?? 0;
}

export default async function AdminOverviewPage() {
  await requireSuperadmin();
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

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

  const [
    activeSuperadmins,
    imagesCreatedLast7Days,
    openCaptionRequests,
    activeLlmProviders,
    activeSignupDomains,
    avgCaptionLength,
    totalCaptionVotes,
    recentCaptionVotes,
    ratedCaptionsCount,
    topRatedCaptions,
    totalCaptions,
  ] = await Promise.all([
    getExactCount("profiles", { eq: { column: "is_superadmin", value: true } }),
    getExactCount("images", { column: "created_datetime_utc", gte: sevenDaysAgoIso }),
    getExactCount("caption_requests", { eq: { column: "status", value: "pending" } }),
    getExactCount("llm_providers", { eq: { column: "is_active", value: true } }),
    getExactCount("allowed_signup_domains", { eq: { column: "is_active", value: true } }),
    getAverageCaptionLength(),
    getExactCount("caption_votes"),
    getCaptionVotesLast7DaysCount(),
    getRatedCaptionsCount(),
    getTopRatedCaptions(5),
    getExactCount("captions"),
  ]);

  const ratingCoveragePct =
    totalCaptions && totalCaptions > 0 && ratedCaptionsCount !== null
      ? Math.round((ratedCaptionsCount / totalCaptions) * 100)
      : null;

  const avgVotesPerCaption =
    totalCaptions && totalCaptions > 0 && totalCaptionVotes !== null
      ? (totalCaptionVotes / totalCaptions).toFixed(2)
      : null;

  const maxResourceCount = resourcesWithCounts.reduce((max, resource) => {
    const value = resource.count ?? 0;
    return Math.max(max, value);
  }, 1);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Superadmin-only control panel for users, humor systems, content, AI configuration, and access controls.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-emerald-300">Privileged Access</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Superadmin Accounts</h2>
          <p className="mt-1 text-sm text-slate-300">Number of profiles with elevated admin permissions.</p>
          <p className="mt-4 text-3xl font-bold text-emerald-300">{formatCount(activeSuperadmins)}</p>
        </article>

        <article className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-sky-300">Content Velocity</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Images Added (7 Days)</h2>
          <p className="mt-1 text-sm text-slate-300">Fresh media recently added to the image pool.</p>
          <p className="mt-4 text-3xl font-bold text-sky-300">{formatCount(imagesCreatedLast7Days)}</p>
        </article>

        <article className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-amber-300">Queue Health</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Pending Caption Requests</h2>
          <p className="mt-1 text-sm text-slate-300">Requests currently waiting to be processed.</p>
          <p className="mt-4 text-3xl font-bold text-amber-300">{formatCount(openCaptionRequests)}</p>
        </article>

        <article className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-fuchsia-300">AI Provider Readiness</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Active LLM Providers</h2>
          <p className="mt-1 text-sm text-slate-300">Providers marked as active and available for routing.</p>
          <p className="mt-4 text-3xl font-bold text-fuchsia-300">{formatCount(activeLlmProviders)}</p>
        </article>

        <article className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-cyan-300">Signup Guardrails</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Active Allowed Domains</h2>
          <p className="mt-1 text-sm text-slate-300">Domains currently enabled for account onboarding.</p>
          <p className="mt-4 text-3xl font-bold text-cyan-300">{formatCount(activeSignupDomains)}</p>
        </article>

        <article className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-5">
          <p className="text-xs uppercase tracking-widest text-rose-300">Output Snapshot</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Average Caption Length</h2>
          <p className="mt-1 text-sm text-slate-300">Measured over the latest caption sample set.</p>
          <p className="mt-4 text-3xl font-bold text-rose-300">
            {avgCaptionLength === null ? "—" : `${avgCaptionLength.toLocaleString()} chars`}
          </p>
        </article>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <header>
          <p className="text-xs uppercase tracking-widest text-indigo-300">Caption Rating Insights</p>
          <h2 className="mt-1 text-xl font-semibold text-white">How users are rating captions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Snapshot of rating activity and the captions currently receiving the most positive feedback.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-indigo-300">Total Votes</p>
            <p className="mt-2 text-3xl font-bold text-indigo-200">{formatCount(totalCaptionVotes)}</p>
            <p className="mt-1 text-xs text-slate-400">All recorded caption ratings.</p>
          </article>

          <article className="rounded-xl border border-blue-300/20 bg-blue-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-blue-300">Votes (7 Days)</p>
            <p className="mt-2 text-3xl font-bold text-blue-200">
              {recentCaptionVotes === null ? "—" : formatCount(recentCaptionVotes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Recent rating activity velocity.</p>
          </article>

          <article className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-cyan-300">Rated Captions</p>
            <p className="mt-2 text-3xl font-bold text-cyan-200">
              {ratedCaptionsCount === null ? "—" : formatCount(ratedCaptionsCount)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Captions with at least one positive rating.</p>
          </article>

          <article className="rounded-xl border border-sky-300/20 bg-sky-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-sky-300">Avg Votes / Caption</p>
            <p className="mt-2 text-3xl font-bold text-sky-200">{avgVotesPerCaption ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {ratingCoveragePct === null ? "Coverage unavailable" : `${ratingCoveragePct}% captions rated`}
            </p>
          </article>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Top Rated Captions</h3>
          {topRatedCaptions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No caption rating data available yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topRatedCaptions.map((caption, index) => (
                <li
                  key={caption.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="line-clamp-2 text-sm text-slate-200">{index + 1}. {caption.content}</p>
                  <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {caption.likeCount} likes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
            {!resource.error ? (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${Math.min(100, Math.max(4, Math.round(((resource.count ?? 0) / maxResourceCount) * 100)))}%`,
                  }}
                />
              </div>
            ) : null}

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
