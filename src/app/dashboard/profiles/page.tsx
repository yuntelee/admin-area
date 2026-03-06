import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ProfilesPage() {
  const admin = createSupabaseAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, email, is_superadmin, is_in_study, is_matrix_admin, created_datetime_utc"
    )
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profiles</h1>
        <p className="mt-1 text-sm text-slate-400">
          Read-only view of all registered users ({profiles?.length ?? 0})
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300">
          Error loading profiles: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-center">Superadmin</th>
              <th className="px-4 py-3 text-center">In Study</th>
              <th className="px-4 py-3 text-center">Matrix Admin</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {profiles?.map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">
                  {p.first_name || p.last_name
                    ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-300">{p.email ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge active={p.is_superadmin} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge active={p.is_in_study} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge active={p.is_matrix_admin} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                  {p.created_datetime_utc
                    ? new Date(p.created_datetime_utc).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No profiles found.
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
