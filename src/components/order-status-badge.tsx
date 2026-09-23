import { cn } from "@/lib/utils";
import { useOrderStatuses } from "@/hooks/use-order-statuses";

const COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const { label } = useOrderStatuses();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
        COLORS[status] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {label(status)}
    </span>
  );
}
