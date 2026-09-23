// Supabase sends people here after Google sign-in, email confirmation or a
// password-reset link. The client picks the session up from the URL.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { LoadingState } from "@/components/states";
import { safeRedirect } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/callback")({
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

  useEffect(() => {
    if (user) navigate({ to: safeRedirect(next, "/account"), replace: true });
  }, [user, next, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (error_description || (timedOut && !loading && !user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl text-foreground">Sign-in didn't finish</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error_description ?? "The link may have expired or was already used. Please try again."}
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
