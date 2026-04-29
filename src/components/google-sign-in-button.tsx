"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) {
    return window.location.origin;
  }

  if (siteUrl.startsWith("http://") || siteUrl.startsWith("https://")) {
    return siteUrl;
  }

  return `https://${siteUrl}`;
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = getOrigin();
      const redirectTo = new URL("/auth/callback", origin).toString();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error || !data.url) {
        setLoading(false);
        setErrorMessage("Unable to start Google sign-in. Please try again.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setLoading(false);
      setErrorMessage(
        "Unable to start Google sign-in. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_SITE_URL in Vercel."
      );
    }
  };

  return (
    <div className="mt-8 space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="google-signin-btn flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-rose-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
