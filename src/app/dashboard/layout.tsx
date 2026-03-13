import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/profiles", label: "Profiles", icon: "👤" },
  { href: "/dashboard/images", label: "Images", icon: "🖼️" },
  { href: "/dashboard/captions", label: "Captions", icon: "💬" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSuperadmin();

  const displayName =
    user.user_metadata?.full_name ?? user.email ?? "Admin";

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="border-b border-white/10 p-5">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Admin Area
          </Link>
          <p className="mt-1 truncate text-xs text-slate-400">
            {displayName}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
    </div>
  );
}
