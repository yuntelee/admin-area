"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = siteUrl || window.location.origin;
    const redirectTo = new URL("/auth/callback", origin).toString();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data.url) {
      setLoading(false);
      window.location.href = "/auth/error";
      return;
    }

    window.location.href = data.url;
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className="mt-8 flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-80"
    >
      {loading ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
