import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin");
  }

  return (
    <main className="landing-page relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mb-8 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="space-y-8">
            <span className="landing-chip inline-flex items-center rounded-full border px-4 py-1 text-sm backdrop-blur">
              Next.js + Supabase + Vercel
            </span>
            <div className="space-y-5">
              <h1 className="landing-heading max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
                A Google-authenticated admin area ready for deployment.
              </h1>
              <p className="landing-copy max-w-2xl text-lg leading-8">
                This starter uses Supabase Auth with Google OAuth and protects the
                app behind login before a user can reach the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="landing-badge rounded-full border px-4 py-2">
                Google sign-in
              </div>
              <div className="landing-badge rounded-full border px-4 py-2">
                Server-rendered session checks
              </div>
              <div className="landing-badge rounded-full border px-4 py-2">
                Vercel-ready setup
              </div>
            </div>
          </section>

          <section className="landing-card rounded-3xl border p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-3">
              <p className="landing-label text-sm font-medium uppercase tracking-[0.3em]">
                Secure access
              </p>
              <h2 className="landing-heading text-3xl font-semibold">
                Sign in with Google
              </h2>
              <p className="landing-copy text-sm leading-6">
                Only authenticated users can access the dashboard route. Configure
                your Supabase project keys and Google provider, then sign in.
              </p>
            </div>

            <GoogleSignInButton />

            <div className="landing-callout mt-6 rounded-2xl border p-4 text-sm">
              After sign-in, users are redirected to the protected dashboard at{" "}
              <Link className="landing-link font-semibold underline" href="/admin">
                /admin
              </Link>
              .
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
