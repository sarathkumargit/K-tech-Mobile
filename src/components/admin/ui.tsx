// Small building blocks shared by the admin pages.
import { cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      {title && (
        <h2 className="mb-4 font-display text-lg tracking-tight text-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  // Link the label to the control by id (not by wrapping it), so a <select>
  // isn't named after all of its options by screen readers.
  const id = useId();
  const hintId = `${id}-hint`;
  const control = isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        ...(hint ? { "aria-describedby": hintId } : {}),
      })
    : children;
  const controlId = isValidElement<{ id?: string }>(children)
    ? (children.props.id ?? id)
    : undefined;
  return (
    <div className={cn("block", className)}>
      <label htmlFor={controlId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {control}
      {hint && (
        <span id={hintId} className="mt-1 block text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hideLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      {!hideLabel && label}
    </label>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "good" | "warn" | "neutral" | "info";
  children: ReactNode;
}) {
  const tones = {
    good: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    info: "bg-sky-100 text-sky-800",
    neutral: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}
    >
      {children}
    </span>
  );
}

// A button that asks "are you sure?" before running a destructive action.
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  className = btnDanger,
  children,
  disabled,
}: {
  onConfirm: () => Promise<unknown> | void;
  title: string;
  description?: string | undefined;
  confirmLabel?: string;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        onClick={() => setOpen(true)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "warn";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-3xl tabular-nums text-foreground">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "warn" ? "font-semibold text-amber-700" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// Datetime-local input value <-> ISO string
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
