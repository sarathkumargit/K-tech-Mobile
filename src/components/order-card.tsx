import type { ReactNode } from "react";
import { ProductImage } from "@/components/product-card";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatDate, formatPrice } from "@/lib/site-config";
import { formatOrderNumber, type OrderWithItems } from "@/services/orderService";

// One order with its items (used on My Account and in the admin panel).
export function OrderCard({ order, actions }: { order: OrderWithItems; actions?: ReactNode }) {
  const a = order.shipping_address;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="font-display text-xl tracking-tight text-foreground">
            Order {formatOrderNumber(order)}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(order.created_at, true)}</p>
        </div>
        <div className="text-right">
          <OrderStatusBadge status={order.status} />
          <p className="mt-1.5 font-display text-xl text-primary">{formatPrice(order.total)}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary/40">
              <ProductImage
                src={item.image_url}
                alt={item.product_name}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="flex-1 text-foreground">
              {item.product_name} × {item.quantity}
            </span>
            <span className="text-muted-foreground">{formatPrice(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <div>
          <p>
            Deliver to {a.full_name}, {a.address_line1}
            {a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city} · {a.phone}
          </p>
          <p className="mt-0.5">
            Subtotal {formatPrice(order.subtotal)}
            {Number(order.discount) > 0 ? ` · Discount −${formatPrice(order.discount)}` : ""} ·
            Shipping {Number(order.shipping_fee) === 0 ? "free" : formatPrice(order.shipping_fee)}
          </p>
        </div>
        {actions}
      </div>
    </div>
  );
}
