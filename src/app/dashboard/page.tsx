import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const initials = user.user_metadata.full_name
    ?.split(" ")
    .map((value: string) => value.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "AU";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/20 text-lg font-semibold text-emerald-300">
              {initials}
            </div>
            <div>
              <p className="text-sm text-slate-400">Signed in as</p>
              <h1 className="text-2xl font-semibold">
                {user.user_metadata.full_name ?? user.email}
              </h1>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Auth provider</p>
            <h2 className="mt-3 text-2xl font-semibold">Google via Supabase</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              OAuth is handled by Supabase Auth and the session is checked on the
              server before rendering this route.
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Deployment target</p>
            <h2 className="mt-3 text-2xl font-semibold">Vercel</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Add the same environment variables in Vercel and register your live
              callback URL in Supabase.
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Protected route</p>
            <h2 className="mt-3 text-2xl font-semibold">/dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Anonymous users are redirected away until they complete Google sign-in.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
