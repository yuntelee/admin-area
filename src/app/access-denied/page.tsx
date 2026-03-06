import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-rose-300">
          Access denied
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Not authorized</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Only users with <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">is_superadmin = true</code> can
          access the admin area. Contact the project owner if you need access.
        </p>
        {reason && (
          <p className="mt-3 break-all rounded-xl bg-white/5 px-4 py-2 text-xs font-mono text-slate-400">
            Debug: {reason}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Back to login
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
