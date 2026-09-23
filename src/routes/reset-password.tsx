import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { readableError } from "@/lib/supabase";
import { updatePassword } from "@/services/authService";

// Reached from the password-reset email (via /auth/callback, which signs the user in).
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a New Password — K-Tech" }] }),
  component: () => (
    <RequireAuth>
      <ResetPassword />
    </RequireAuth>
  ),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 6) {
          toast.error("Use at least 6 characters.");
          return;
        }
        setSaving(true);
        try {
          await updatePassword(password);
          toast.success("Password updated");
          navigate({ to: "/account" });
        } catch (err) {
          toast.error(readableError(err));
        } finally {
          setSaving(false);
        }
      }}
      className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6"
    >
      <h1 className="font-display text-3xl tracking-tight text-foreground">Set a new password</h1>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="mt-6 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
