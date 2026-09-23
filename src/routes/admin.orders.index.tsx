import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { PageHeader } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useOrderStatuses } from "@/hooks/use-order-statuses";
import { qk } from "@/lib/query-keys";
import { formatDate, formatPrice } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { adminListOrders, formatOrderNumber } from "@/services/orderService";

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: z.object({ status: z.string().optional() }),
  component: OrdersPage,
});

function OrdersPage() {
  const { status } = Route.useSearch();
  const { statuses } = useOrderStatuses();
  const orders = useQuery({
    queryKey: qk.admin.orders(status ?? "all"),
    queryFn: () => adminListOrders(status ? { status } : {}),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description="Every order placed in the shop. Open one to update its status."
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip label="All" active={!status} status={undefined} />
        {statuses.map((s) => (
          <FilterChip key={s.code} label={s.label} active={status === s.code} status={s.code} />
        ))}
      </div>

      {orders.isLoading ? (
        <LoadingState label="Loading orders…" />
      ) : orders.error ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      ) : !orders.data || orders.data.length === 0 ? (
        <EmptyState title={status ? "No orders with this status" : "No orders yet"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-2 py-3 font-semibold">Customer</th>
                <th className="px-2 py-3 font-semibold">Items</th>
                <th className="px-2 py-3 font-semibold">Date</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="font-semibold text-primary hover:underline"
                    >
                      {formatOrderNumber(o)}
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <p>{o.shipping_address.full_name}</p>
                    <p className="text-xs text-muted-foreground">{o.shipping_address.phone}</p>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {o.order_items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatDate(o.created_at, true)}
                  </td>
                  <td className="px-2 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatPrice(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  status,
}: {
  label: string;
  active: boolean;
  status: string | undefined;
}) {
  return (
    <Link
      to="/admin/orders"
      search={status ? { status } : {}}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
