import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GoogleSignIn } from "@/components/google-button";
import { NotConnectedState } from "@/components/states";
import { safeRedirect } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { readableError } from "@/lib/supabase";
import { signUpWithEmail } from "@/services/authService";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — K-Tech" },
      { name: "description", content: "Create your K-Tech account." },
    ],
  }),
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignupPage,
});

function SignupPage() {
  const { configured, user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const next = safeRedirect(redirect);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Signed in already, or email confirmation is off and signing up logged them in.
  useEffect(() => {
    if (user) navigate({ to: next, replace: true });
  }, [user, next, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Use at least 6 characters for your password.");
      return;
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (needsConfirmation) setSentTo(email.trim());
      else toast.success("Account created — welcome!");
    } catch (err) {
      toast.error(readableError(err, "Couldn't create your account."));
    } finally {
      setLoading(false);
    }
  };

  if (!configured) return <NotConnectedState className="mx-auto my-16 max-w-xl" />;

  if (sentTo) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-14 text-center sm:px-6">
        <h1 className="font-display text-3xl tracking-tight text-foreground">Check Your Email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>.
          Click it to activate your account.
        </p>
        <Link
          to="/login"
          search={redirect ? { redirect } : {}}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">Create Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Join K-Tech to save your cart and track orders.
      </p>

      <GoogleSignIn next={next} />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Full Name</span>
          <input
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </label>
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
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
          <input
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          search={redirect ? { redirect } : {}}
          className="font-semibold text-primary hover:text-cozy-burnt"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";
