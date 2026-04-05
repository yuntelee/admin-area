import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Checks that the current user is authenticated.
 * Redirects to "/" if not logged in.
 * Returns the user object.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { user };
}

/**
 * Checks that the current user is both authenticated and has admin privileges.
 * Redirects to /access-denied when the account lacks admin privileges.
 */
export async function requireSuperadmin() {
  const { user } = await requireAuth();
  const admin = createSupabaseAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle<{ is_superadmin?: boolean | null }>();

  const hasAdminAccess = Boolean(profile?.is_superadmin);
  if (error || !hasAdminAccess) {
    redirect("/access-denied");
  }

  return { user };
}
