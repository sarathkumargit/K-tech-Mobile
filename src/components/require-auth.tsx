// Client-side page guards. They only decide what to SHOW — the real
// protection is Row Level Security in the database.
import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { LoadingState, NotConnectedState } from "@/components/states";

// Waits for the saved session, then renders the page or sends the visitor to
// /login (and back here afterwards).
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const returnTo = useRef(href);
  const redirected = useRef(false);

  useEffect(() => {
    if (configured && !loading && !user && !redirected.current) {
      redirected.current = true;
      navigate({ to: "/login", search: { redirect: returnTo.current }, replace: true });
    }
  }, [configured, loading, user, navigate]);

  if (!configured) return <NotConnectedState className="mx-auto my-16 max-w-xl" />;
  if (loading || !user) return <LoadingState label="Checking your sign-in…" />;
  return <>{children}</>;
}

// Signed in AND listed in admin_users (checked in the database with is_admin()).
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (user && !loading && !adminLoading && !isAdmin && !redirected.current) {
      redirected.current = true;
      toast.error("That page is for administrators only.");
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, adminLoading, isAdmin, navigate]);

  return (
    <RequireAuth>
      {adminLoading || !isAdmin ? <LoadingState label="Checking admin access…" /> : children}
    </RequireAuth>
  );
}

// Only allow redirects to paths inside this site.
export function safeRedirect(target: string | undefined, fallback = "/account"): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}
