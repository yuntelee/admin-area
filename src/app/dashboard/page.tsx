import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
};

function StatCard({ label, value, subtitle, accent = "text-emerald-300" }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </article>
  );
}

type BarProps = { label: string; value: number; max: number; color?: string };

function HorizontalBar({ label, value, max, color = "bg-emerald-400" }: BarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-slate-300">{label}</span>
        <span className="text-slate-400">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardOverview() {
  const admin = createSupabaseAdminClient();

  /* ---- parallel count queries ---- */
  const [
    profilesRes,
    imagesRes,
    captionsRes,
    votesRes,
    likesRes,
    sharesRes,
    reportsRes,
    reportedImgRes,
    publicCaptionsRes,
    featuredCaptionsRes,
    publicImagesRes,
    commonUseImagesRes,
    humorFlavorsRes,
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("images").select("*", { count: "exact", head: true }),
    admin.from("captions").select("*", { count: "exact", head: true }),
    admin.from("caption_votes").select("*", { count: "exact", head: true }),
    admin.from("caption_likes").select("*", { count: "exact", head: true }),
    admin.from("shares").select("*", { count: "exact", head: true }),
    admin.from("reported_captions").select("*", { count: "exact", head: true }),
    admin.from("reported_images").select("*", { count: "exact", head: true }),
    admin.from("captions").select("*", { count: "exact", head: true }).eq("is_public", true),
    admin.from("captions").select("*", { count: "exact", head: true }).eq("is_featured", true),
    admin.from("images").select("*", { count: "exact", head: true }).eq("is_public", true),
    admin.from("images").select("*", { count: "exact", head: true }).eq("is_common_use", true),
    admin.from("humor_flavors").select("id, slug"),
  ]);

  const totalProfiles = profilesRes.count ?? 0;
  const totalImages = imagesRes.count ?? 0;
  const totalCaptions = captionsRes.count ?? 0;
  const totalVotes = votesRes.count ?? 0;
  const totalLikes = likesRes.count ?? 0;
  const totalShares = sharesRes.count ?? 0;
  const totalReportedCaptions = reportsRes.count ?? 0;
  const totalReportedImages = reportedImgRes.count ?? 0;
  const publicCaptions = publicCaptionsRes.count ?? 0;
  const featuredCaptions = featuredCaptionsRes.count ?? 0;
  const publicImages = publicImagesRes.count ?? 0;
  const commonUseImages = commonUseImagesRes.count ?? 0;

  /* ---- top captioners ---- */
  const { data: topCaptioners } = await admin
    .from("captions")
    .select("profile_id, profiles(first_name, last_name, email)")
    .order("created_datetime_utc", { ascending: false })
    .limit(500);

  const captionerCounts: Record<string, { name: string; count: number }> = {};
  topCaptioners?.forEach((c) => {
    const pid = c.profile_id;
    const p = c.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    };
    const name = p?.first_name
      ? `${p.first_name} ${p.last_name ?? ""}`.trim()
      : (p?.email ?? pid);
    if (!captionerCounts[pid]) captionerCounts[pid] = { name, count: 0 };
    captionerCounts[pid].count++;
  });

  const topCaptioneList = Object.values(captionerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxCaptionerCount = topCaptioneList[0]?.count ?? 1;

  /* ---- most captioned images ---- */
  const { data: topImages } = await admin
    .from("captions")
    .select("image_id, images(url, image_description)")
    .limit(1000);

  const imageCounts: Record<string, { desc: string; count: number }> = {};
  topImages?.forEach((c) => {
    const iid = c.image_id;
    const img = c.images as unknown as {
      url: string | null;
      image_description: string | null;
    };
    const desc =
      img?.image_description?.slice(0, 60) ?? img?.url?.slice(0, 40) ?? iid;
    if (!imageCounts[iid]) imageCounts[iid] = { desc, count: 0 };
    imageCounts[iid].count++;
  });

  const topImageList = Object.values(imageCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxImageCount = topImageList[0]?.count ?? 1;

  /* ---- humor flavors ---- */
  const flavorCounts: Record<string, number> = {};
  const { data: captionFlavors } = await admin
    .from("captions")
    .select("humor_flavor_id")
    .not("humor_flavor_id", "is", null)
    .limit(1000);

  captionFlavors?.forEach((c) => {
    const fid = String(c.humor_flavor_id);
    flavorCounts[fid] = (flavorCounts[fid] ?? 0) + 1;
  });

  const flavorMap: Record<string, string> = {};
  humorFlavorsRes.data?.forEach((f) => {
    flavorMap[String(f.id)] = f.slug;
  });

  const flavorList = Object.entries(flavorCounts)
    .map(([fid, count]) => ({ name: flavorMap[fid] ?? `flavor-${fid}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxFlavorCount = flavorList[0]?.count ?? 1;

  /* ---- recent captions ---- */
  const { data: recentCaptions } = await admin
    .from("captions")
    .select("id, content, created_datetime_utc, profiles(first_name, last_name)")
    .order("created_datetime_utc", { ascending: false })
    .limit(5);

  const captionsPerImage =
    totalImages > 0 ? (totalCaptions / totalImages).toFixed(1) : "0";
  const votesPerCaption =
    totalCaptions > 0 ? (totalVotes / totalCaptions).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Platform overview and key metrics
        </p>
      </div>

      {/* Primary stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={totalProfiles} />
        <StatCard label="Total Images" value={totalImages} accent="text-sky-300" />
        <StatCard label="Total Captions" value={totalCaptions} accent="text-violet-300" />
        <StatCard label="Total Votes" value={totalVotes} accent="text-amber-300" />
      </section>

      {/* Secondary stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Likes" value={totalLikes} accent="text-pink-300" />
        <StatCard label="Shares" value={totalShares} accent="text-orange-300" />
        <StatCard
          label="Reported Captions"
          value={totalReportedCaptions}
          accent="text-rose-400"
        />
        <StatCard
          label="Reported Images"
          value={totalReportedImages}
          accent="text-rose-400"
        />
      </section>

      {/* Derived insights */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Captions / Image"
          value={captionsPerImage}
          subtitle="average"
          accent="text-teal-300"
        />
        <StatCard
          label="Votes / Caption"
          value={votesPerCaption}
          subtitle="average engagement"
          accent="text-teal-300"
        />
        <StatCard
          label="Public Captions"
          value={publicCaptions}
          subtitle={`of ${totalCaptions} total`}
          accent="text-sky-300"
        />
        <StatCard
          label="Featured Captions"
          value={featuredCaptions}
          accent="text-amber-300"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Public Images"
          value={publicImages}
          subtitle={`of ${totalImages} total`}
          accent="text-sky-300"
        />
        <StatCard
          label="Common-Use Images"
          value={commonUseImages}
          accent="text-emerald-300"
        />
        <StatCard
          label="Humor Flavors"
          value={humorFlavorsRes.data?.length ?? 0}
          accent="text-violet-300"
        />
      </section>

      {/* Charts & leaderboards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top captioners */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Top Captioners
          </h2>
          <div className="space-y-3">
            {topCaptioneList.length === 0 && (
              <p className="text-xs text-slate-500">No data yet</p>
            )}
            {topCaptioneList.map((c, i) => (
              <HorizontalBar
                key={i}
                label={c.name}
                value={c.count}
                max={maxCaptionerCount}
                color="bg-violet-400"
              />
            ))}
          </div>
        </section>

        {/* Most captioned images */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Most Captioned Images
          </h2>
          <div className="space-y-3">
            {topImageList.length === 0 && (
              <p className="text-xs text-slate-500">No data yet</p>
            )}
            {topImageList.map((img, i) => (
              <HorizontalBar
                key={i}
                label={img.desc}
                value={img.count}
                max={maxImageCount}
                color="bg-sky-400"
              />
            ))}
          </div>
        </section>

        {/* Humor flavor usage */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Humor Flavor Popularity
          </h2>
          <div className="space-y-3">
            {flavorList.length === 0 && (
              <p className="text-xs text-slate-500">No data yet</p>
            )}
            {flavorList.map((f, i) => (
              <HorizontalBar
                key={i}
                label={f.name}
                value={f.count}
                max={maxFlavorCount}
                color="bg-amber-400"
              />
            ))}
          </div>
        </section>

        {/* Recent captions */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Recent Captions
          </h2>
          <div className="space-y-3">
            {(!recentCaptions || recentCaptions.length === 0) && (
              <p className="text-xs text-slate-500">No captions yet</p>
            )}
            {recentCaptions?.map((c) => {
              const p = c.profiles as unknown as {
                first_name: string | null;
                last_name: string | null;
              };
              const name = p?.first_name
                ? `${p.first_name} ${p.last_name ?? ""}`.trim()
                : "Unknown";
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <p className="text-sm text-slate-200 line-clamp-2">
                    {c.content || (
                      <span className="italic text-slate-500">empty</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    by {name} &middot;{" "}
                    {new Date(c.created_datetime_utc).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
