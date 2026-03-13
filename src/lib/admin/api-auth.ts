import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireApiSuperadmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error: { code: "UNAUTHENTICATED", message: "Authentication required." },
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle<{ is_superadmin?: boolean | null }>();

  if (error || !profile?.is_superadmin) {
    return {
      ok: false as const,
      status: 403,
      error: { code: "FORBIDDEN", message: "Superadmin access required." },
    };
  }

  return { ok: true as const, userId: user.id };
}
