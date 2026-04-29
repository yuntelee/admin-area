import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSuperadmin } from "@/lib/auth";
import { getResourceSections } from "@/lib/admin/resources";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireSuperadmin();
  const sections = getResourceSections();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 h-screen w-80 shrink-0 overflow-y-auto border-r border-white/10 bg-background/85 p-4 backdrop-blur">
        <div className="mb-6 border-b border-white/10 pb-4">
          <Link href="/admin" className="text-xl font-bold tracking-tight">
            Admin Area
          </Link>
          <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
          <div className="mt-3">
            <ThemeToggle />
          </div>
        </div>

        <nav className="space-y-5">
          <div>
            <Link
              href="/admin"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Dashboard Overview
            </Link>
          </div>

          {Object.entries(sections).map(([section, resources]) => (
            <div key={section}>
              <p className="mb-2 px-3 text-xs uppercase tracking-widest text-slate-500">{section}</p>
              <div className="space-y-1">
                {resources.map((resource) => (
                  <Link
                    key={resource.key}
                    href={`/admin/${resource.key}`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {resource.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-8 border-t border-white/10 pt-3">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
    </div>
  );
}
