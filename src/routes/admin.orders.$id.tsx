import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Field, PageHeader, Panel, btnPrimary, inputCls } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ProductImage } from "@/components/product-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useOrderStatuses } from "@/hooks/use-order-statuses";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { formatDate, formatPrice } from "@/lib/site-config";
import {
  adminGetOrder,
  formatOrderNumber,
  updateOrderNotes,
  updateOrderStatus,
} from "@/services/orderService";

export const Route = createFileRoute("/admin/orders/$id")({ component: OrderDetail });

function OrderDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { statuses } = useOrderStatuses();
  const order = useQuery({ queryKey: qk.admin.order(id), queryFn: () => adminGetOrder(id) });
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (order.data) {
      setStatus(order.data.status);
      setNotes(order.data.notes ?? "");
    }
  }, [order.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] }); // cancelling restocks
  };

  const saveStatus = useMutation({
    mutationFn: () => updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success(status === "cancelled" ? "Order cancelled — stock returned" : "Status updated");
      refresh();
    },
    onError: (err) => {
      toast.error(readableError(err));
      if (order.data) setStatus(order.data.status);
    },
  });

  const saveNotes = useMutation({
    mutationFn: () => updateOrderNotes(id, notes),
    onSuccess: () => {
      toast.success("Notes saved");
      refresh();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const back = (
    <Link
      to="/admin/orders"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Orders
    </Link>
  );

  if (order.isLoading) return <LoadingState label="Loading order…" />;
  if (order.error) return <ErrorState error={order.error} onRetry={() => order.refetch()} />;
  if (!order.data)
    return (
      <div className="space-y-5">
        {back}
        <EmptyState title="Order not found" />
      </div>
    );

  const o = order.data;
  const a = o.shipping_address;
  const locked = o.status === "cancelled";

  return (
    <div className="space-y-5">
      {back}
      <PageHeader
        title={`Order ${formatOrderNumber(o)}`}
        description={`Placed ${formatDate(o.created_at, true)}`}
        actions={<OrderStatusBadge status={o.status} className="text-sm" />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Items">
            <ul className="divide-y divide-border">
              {o.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    <ProductImage
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {item.product_id ? (
                        <Link
                          to="/admin/products/edit/$id"
                          params={{ id: item.product_id }}
                          className="hover:text-primary"
                        >
                          {item.product_name}
                        </Link>
                      ) : (
                        item.product_name
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unit_price)}
                      {Number(item.unit_price) < Number(item.original_unit_price) &&
                        ` (was ${formatPrice(item.original_unit_price)})`}
                      {item.sku ? ` · SKU ${item.sku}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
              <Line label="Subtotal" value={formatPrice(o.subtotal)} />
              {Number(o.discount) > 0 && (
                <Line label="Offer discount" value={`− ${formatPrice(o.discount)}`} />
              )}
              <Line
                label="Shipping"
                value={Number(o.shipping_fee) === 0 ? "Free" : formatPrice(o.shipping_fee)}
              />
              <Line label="Total (pay on delivery)" value={formatPrice(o.total)} bold />
            </dl>
          </Panel>

          <Panel title="Internal notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              placeholder="Customer notes appear here too."
            />
            <button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending}
              className={`${btnPrimary} mt-3`}
            >
              {saveNotes.isPending ? "Saving…" : "Save notes"}
            </button>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Status">
            <Field
              label="Order status"
              hint={
                locked
                  ? "Cancelled orders can't be reopened."
                  : "Cancelling puts the items back in stock."
              }
            >
              <select
                value={status}
                disabled={locked}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls}
              >
                {statuses.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              onClick={() => saveStatus.mutate()}
              disabled={locked || status === o.status || saveStatus.isPending}
              className={`${btnPrimary} mt-3 w-full`}
            >
              {saveStatus.isPending ? "Updating…" : "Update status"}
            </button>
          </Panel>

          <Panel title="Customer">
            <div className="space-y-1 text-sm">
              {o.customer ? (
                <Link
                  to="/admin/users/$id"
                  params={{ id: o.customer.id }}
                  className="font-semibold text-primary hover:underline"
                >
                  {o.customer.full_name || o.customer.email || "Customer"}
                </Link>
              ) : (
                <p className="text-muted-foreground">Account deleted</p>
              )}
              {o.customer_email && <p className="text-muted-foreground">{o.customer_email}</p>}
            </div>
            <div className="mt-4 space-y-0.5 border-t border-border pt-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deliver to
              </p>
              <p className="font-medium text-foreground">{a.full_name}</p>
              <p>
                <a href={`tel:${a.phone}`} className="text-primary hover:underline">
                  {a.phone}
                </a>
              </p>
              <p>{a.address_line1}</p>
              {a.address_line2 && <p>{a.address_line2}</p>}
              <p>
                {a.city}
                {a.postal_code ? ` ${a.postal_code}` : ""}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
