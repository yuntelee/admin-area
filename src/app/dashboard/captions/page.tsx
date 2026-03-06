import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function CaptionsPage() {
  const admin = createSupabaseAdminClient();

  const { data: captions, error } = await admin
    .from("captions")
    .select(
      "id, content, is_public, is_featured, like_count, created_datetime_utc, humor_flavor_id, profiles(first_name, last_name, email), images(url, image_description), humor_flavors(slug)"
    )
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Captions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Read-only view of all captions ({captions?.length ?? 0})
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300">
          Error loading captions: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">Content</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Humor</th>
              <th className="px-4 py-3 text-center">Public</th>
              <th className="px-4 py-3 text-center">Featured</th>
              <th className="px-4 py-3 text-right">Likes</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {captions?.map((c) => {
              const profile = c.profiles as unknown as {
                first_name: string | null;
                last_name: string | null;
                email: string | null;
              };
              const flavor = c.humor_flavors as unknown as {
                slug: string | null;
              };
              const authorName = profile?.first_name
                ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
                : (profile?.email ?? "—");

              return (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="max-w-sm px-4 py-3 text-slate-200">
                    <p className="line-clamp-2">{c.content || "—"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {authorName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {flavor?.slug ? (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        {flavor.slug}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge active={c.is_public} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge active={c.is_featured} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {c.like_count ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {c.created_datetime_utc
                      ? new Date(c.created_datetime_utc).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {(!captions || captions.length === 0) && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No captions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ active }: { active: boolean | null }) {
  if (active) {
    return (
      <span className="inline-block rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
        Yes
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
      No
    </span>
  );
}
