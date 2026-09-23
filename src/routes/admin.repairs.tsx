import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { ConfirmButton, PageHeader, inputCls } from "@/components/admin/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { formatDate, whatsappLink } from "@/lib/site-config";
import {
  REPAIR_STATUSES,
  adminListRepairs,
  deleteRepair,
  updateRepairStatus,
} from "@/services/repairService";
import type { RepairStatus } from "@/types/database";

export const Route = createFileRoute("/admin/repairs")({ component: RepairsPage });

function RepairsPage() {
  const queryClient = useQueryClient();
  const repairs = useQuery({ queryKey: qk.admin.repairs, queryFn: adminListRepairs });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin"] });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RepairStatus }) =>
      updateRepairStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      refresh();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Repair requests"
        description="Sent from the “Book a Repair” form on the site."
      />
      {repairs.isLoading ? (
        <LoadingState label="Loading repair requests…" />
      ) : repairs.error ? (
        <ErrorState error={repairs.error} onRetry={() => repairs.refetch()} />
      ) : !repairs.data || repairs.data.length === 0 ? (
        <EmptyState title="No repair requests yet" />
      ) : (
        <ul className="space-y-3">
          {repairs.data.map((r) => {
            const wa = whatsappLink(
              r.phone_number,
              `Hi ${r.customer_name}, about your ${r.phone_brand} ${r.phone_model} repair:`,
            );
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {r.phone_brand} {r.phone_model} — {r.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.created_at, true)}
                    </p>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) =>
                      setStatus.mutate({ id: r.id, status: e.target.value as RepairStatus })
                    }
                    aria-label="Repair status"
                    className={`${inputCls} w-auto py-1.5`}
                  >
                    {REPAIR_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-foreground">{r.issue}</p>
                {r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${r.phone_number}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    <Phone className="h-3.5 w-3.5" /> {r.phone_number}
                  </a>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  <ConfirmButton
                    title="Delete this repair request?"
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    onConfirm={async () => {
                      try {
                        await deleteRepair(r.id);
                        toast.success("Deleted");
                        refresh();
                      } catch (err) {
                        toast.error(readableError(err));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
