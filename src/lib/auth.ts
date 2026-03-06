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

  // First try matching by auth user id
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email, is_superadmin")
    .eq("id", user.id)
    .single();

  // If no match by id, try matching by email
  if (!profile && user.email) {
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email, is_superadmin")
      .eq("email", user.email)
      .single();

    if (profileByEmail?.is_superadmin) {
      return { user, profile: profileByEmail };
    }

    const reason = profileByEmail
      ? `found_by_email_but_not_superadmin`
      : `no_profile_for_id_${user.id}_or_email_${user.email}`;
    redirect(`/access-denied?reason=${encodeURIComponent(reason)}`);
  }

  if (!profile || !profile.is_superadmin) {
    const reason = !profile
      ? `no_profile_row_for_id_${user.id}${error ? `_err_${error.message}` : ""}`
      : `is_superadmin_is_false`;
    redirect(`/access-denied?reason=${encodeURIComponent(reason)}`);
  }

  return { user, profile };
}
