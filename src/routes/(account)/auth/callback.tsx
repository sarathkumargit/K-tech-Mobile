// Supabase sends people here after Google sign-in, email confirmation or a
// password-reset link. The client picks the session up from the URL.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { LoadingState } from "@/components/common/states";
import { safeRedirect } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/(account)/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in — K-Tech" }, NOINDEX] }),
  validateSearch: z
    .object({
      next: z.string().optional(),
      error_description: z.string().optional(),
    })
    .passthrough(), // keep ?code= for Supabase to read
  component: AuthCallback,
});

function AuthCallback() {
  const { user, loading } = useAuth();
  const { next, error_description } = Route.useSearch();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  // Implicit flow: Supabase puts the token in the URL hash (#access_token=...&type=recovery).
  // detectSessionInUrl:true picks it up automatically. For password-reset links
  // we redirect to /reset-password so the user can enter a new password.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
    const type = hash.get("type");

    // Security: strip the token/code from the URL immediately so it doesn't
    // sit in browser history, get sent as a Referer header, or get captured
    // by third-party scripts. Supabase (detectSessionInUrl: true) has already
    // read the hash synchronously before this effect runs.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (type === "recovery") {
      navigate({ to: "/reset-password", replace: true });
      return;
    }
    // Legacy PKCE code path (kept as fallback — remove once all issued links expire).
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      getSupabase()
        .auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) setExchangeError(error.message);
          // Strip the ?code= param too once it has been exchanged.
          window.history.replaceState(null, "", window.location.pathname);
        });
    }
  }, [navigate]);

  useEffect(() => {
    if (user) navigate({ to: safeRedirect(next, "/account"), replace: true });
  }, [user, next, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (exchangeError || error_description || (timedOut && !loading && !user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl text-foreground">Sign-in didn't finish</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {exchangeError ??
            error_description ??
            "The link may have expired or was already used. Please try again."}
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return <LoadingState label="Signing you in…" className="py-32" />;
}
