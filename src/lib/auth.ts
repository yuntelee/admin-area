import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/");
  }

  return session;
}

async function ensureAdminAccess(userId: string) {
  const admin = createSupabaseAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("is_superadmin, is_matrix_admin")
    .eq("id", userId)
    .maybeSingle<{ is_superadmin?: boolean | null; is_matrix_admin?: boolean | null }>();

  const hasAdminAccess = Boolean(profile?.is_superadmin || profile?.is_matrix_admin);
  if (error || !hasAdminAccess) {
    redirect("/access-denied");
  }
}

/**
 * Checks that the current user is authenticated.
 * Redirects to "/" if not logged in.
 * Returns the user object.
 */
export async function requireAuth() {
  const session = await requireSession();
  return { user: session.user };
}

/**
 * Checks that the current user is authenticated and has a valid access token.
 * Redirects to "/" if unavailable.
 */
export async function requireAuthWithAccessToken() {
  const session = await requireSession();
  if (!session.access_token) {
    redirect("/");
  }

  return { user: session.user, accessToken: session.access_token };
}

/**
 * Checks that the current user is both authenticated and has admin privileges.
 * Access is granted when either is_superadmin or is_matrix_admin is true.
 * Redirects to /access-denied when the account lacks admin privileges.
 */
export async function requireSuperadmin() {
  const { user } = await requireAuth();
  await ensureAdminAccess(user.id);

  return { user };
}

/**
 * Checks that the current user is an admin and returns a valid JWT access token.
 */
export async function requireSuperadminWithAccessToken() {
  const { user, accessToken } = await requireAuthWithAccessToken();
  await ensureAdminAccess(user.id);

  return { user, accessToken };
}
