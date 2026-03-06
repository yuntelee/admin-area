import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_35%,_#020617_100%)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="space-y-8">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm text-white/80 backdrop-blur">
              Next.js + Supabase + Vercel
            </span>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                A Google-authenticated admin area ready for deployment.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                This starter uses Supabase Auth with Google OAuth and protects the
                app behind login before a user can reach the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Google sign-in
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Server-rendered session checks
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Vercel-ready setup
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-300">
                Secure access
              </p>
              <h2 className="text-3xl font-semibold text-white">
                Sign in with Google
              </h2>
              <p className="text-sm leading-6 text-slate-300">
                Only authenticated users can access the dashboard route. Configure
                your Supabase project keys and Google provider, then sign in.
              </p>
            </div>

            <a
              href="/auth/sign-in"
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-slate-100"
            >
              Continue with Google
            </a>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
              After sign-in, users are redirected to the protected dashboard at{" "}
              <Link className="font-semibold text-white underline" href="/dashboard">
                /dashboard
              </Link>
              .
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
