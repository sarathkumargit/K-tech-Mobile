import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader, Panel, StatTile, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { formatDate, formatPrice } from "@/lib/site-config";
import { getDashboardStats } from "@/services/adminService";
import { adminListOrders, formatOrderNumber } from "@/services/orderService";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const stats = useQuery({ queryKey: qk.admin.stats, queryFn: getDashboardStats });
  const recent = useQuery({
    queryKey: qk.admin.orders("recent"),
    queryFn: () => adminListOrders({ limit: 8 }),
  });
  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live numbers from your Supabase database."
        actions={
          <>
            <Link to="/admin/products/create" className={btnPrimary}>
              <Plus className="h-4 w-4" /> Add product
            </Link>
            <Link to="/admin/offers" className={btnSecondary}>
              New offer
            </Link>
          </>
        }
      />

      {stats.isLoading ? (
        <LoadingState label="Loading dashboard…" />
      ) : stats.error ? (
        <ErrorState
          error={stats.error}
          title="Unable to load dashboard"
          onRetry={() => stats.refetch()}
        />
      ) : s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Products" value={s.total_products} sub={`${s.active_products} active`} />
          <StatTile
            label="Low stock"
            value={s.low_stock}
            sub={s.low_stock > 0 ? "5 or fewer left" : "All stocked"}
            {...(s.low_stock > 0 ? { tone: "warn" as const } : {})}
          />
          <StatTile label="Active offers" value={s.active_offers} sub="Running right now" />
          <StatTile label="Users" value={s.total_users} sub="Registered accounts" />
          <StatTile label="Orders" value={s.total_orders} sub="All time" />
          <StatTile
            label="Pending orders"
            value={s.pending_orders}
            sub={s.pending_orders > 0 ? "Waiting for confirmation" : "Nothing waiting"}
            {...(s.pending_orders > 0 ? { tone: "warn" as const } : {})}
          />
          <StatTile
            label="Revenue"
            value={formatPrice(s.revenue)}
            sub="Excluding cancelled orders"
          />
          <StatTile label="New repair requests" value={s.new_repairs} sub="Not contacted yet" />
        </div>
      ) : null}

      <Panel title="Recent orders">
        {recent.isLoading ? (
          <LoadingState label="Loading orders…" className="py-8" />
        ) : recent.error ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : !recent.data || recent.data.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="New orders will appear here."
            className="py-8"
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 font-semibold">Order</th>
                  <th className="px-2 py-2 font-semibold">Customer</th>
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        to="/admin/orders/$id"
                        params={{ id: o.id }}
                        className="font-semibold text-primary hover:underline"
                      >
                        {formatOrderNumber(o)}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">{o.shipping_address.full_name}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-2 py-2.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                      {formatPrice(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          to="/admin/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-cozy-burnt"
        >
          All orders <ArrowRight className="h-4 w-4" />
        </Link>
      </Panel>
    </div>
  );
}
