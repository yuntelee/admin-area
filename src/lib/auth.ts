import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Checks that the current user is authenticated AND is a superadmin.
 * Redirects to "/" if not logged in, or "/access-denied" if not superadmin.
 * Returns the user and profile if authorized.
 */
export async function requireSuperadmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email, is_superadmin")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_superadmin) {
    redirect("/access-denied");
  }

  return { user, profile };
}
