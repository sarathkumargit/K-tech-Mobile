// Shared loading / empty / error blocks so no page ever shows a blank screen.
import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, PlugZap } from "lucide-react";
import { readableError, SupabaseNotConfiguredError } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string | undefined;
}) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
    >
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-10 w-10" />}</div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  title = "Couldn't load this",
  onRetry,
  className,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string | undefined;
}) {
  if (error instanceof SupabaseNotConfiguredError)
    return <NotConnectedState className={className} />;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-9 w-9 text-destructive" />
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{readableError(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-cozy-burnt"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function NotConnectedState({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 px-6 py-12 text-center",
        className,
      )}
    >
      <PlugZap className="h-9 w-9 text-primary" />
      <p className="mt-3 text-base font-semibold text-foreground">The store isn't connected yet</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Add <code className="text-foreground">VITE_SUPABASE_URL</code> and{" "}
        <code className="text-foreground">VITE_SUPABASE_ANON_KEY</code> to{" "}
        <code className="text-foreground">.env.local</code>, then restart{" "}
        <code className="text-foreground">npm run dev</code>. See SUPABASE_SETUP.md.
      </p>
    </div>
  );
}
