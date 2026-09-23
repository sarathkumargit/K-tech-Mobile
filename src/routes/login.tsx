import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GoogleSignIn } from "@/components/google-button";
import { NotConnectedState } from "@/components/states";
import { safeRedirect } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { readableError } from "@/lib/supabase";
import { sendPasswordReset, signInWithEmail } from "@/services/authService";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — K-Tech" },
      { name: "description", content: "Sign in to your K-Tech account." },
    ],
  }),
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});

function LoginPage() {
  const { configured, user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const next = safeRedirect(redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in (or just signed in): continue to where they were going.
  useEffect(() => {
    if (user) navigate({ to: next, replace: true });
  }, [user, next, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      toast.success("Welcome back!");
    } catch (err) {
      const message = readableError(err);
      toast.error(
        /email not confirmed/i.test(message)
          ? "Please confirm your email first — check your inbox for the link."
          : /invalid login/i.test(message)
            ? "Wrong email or password."
            : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (!email.trim()) {
      toast.info("Type your email above first, then click “Forgot password”.");
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      toast.success("Check your inbox for a password reset link.");
    } catch (err) {
      toast.error(readableError(err));
    }
  };

  if (!configured) return <NotConnectedState className="mx-auto my-16 max-w-xl" />;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">Sign In</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back. Sign in to see your cart and orders.
      </p>

      <GoogleSignIn next={next} />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </label>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-medium text-primary hover:text-cozy-burnt"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to K-Tech?{" "}
        <Link
          to="/signup"
          search={redirect ? { redirect } : {}}
          className="font-semibold text-primary hover:text-cozy-burnt"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";
