import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
import {
  ConfirmButton,
  PageHeader,
  Panel,
  Pill,
  btnPrimary,
  btnDanger,
} from "@/components/admin/ui";
import { OrderCard } from "@/components/order-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useAuth } from "@/lib/auth-context";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { formatDate, formatPrice } from "@/lib/site-config";
import { adminListOrders } from "@/services/orderService";
import { adminGetUser, setUserAdmin } from "@/services/userService";

export const Route = createFileRoute("/admin/users/$id")({ component: UserDetail });

function UserDetail() {
  const { id } = Route.useParams();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const user = useQuery({ queryKey: qk.admin.user(id), queryFn: () => adminGetUser(id) });
  const orders = useQuery({
    queryKey: qk.admin.userOrders(id),
    queryFn: () => adminListOrders({ userId: id }),
  });

  const setAdmin = useMutation({
    mutationFn: (makeAdmin: boolean) => setUserAdmin(id, makeAdmin),
    onSuccess: (_, makeAdmin) => {
      toast.success(makeAdmin ? "Admin access given" : "Admin access removed");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const back = (
    <Link
      to="/admin/users"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Users
    </Link>
  );

  if (user.isLoading) return <LoadingState label="Loading user…" />;
  if (user.error) return <ErrorState error={user.error} onRetry={() => user.refetch()} />;
  if (!user.data)
    return (
      <div className="space-y-5">
        {back}
        <EmptyState title="User not found" />
      </div>
    );

  const u = user.data;
  const isMe = me?.id === u.id;
  const activeOrders = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  const spent = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-5">
      {back}
      <PageHeader
        title={u.full_name || u.email || "User"}
        description={`Joined ${formatDate(u.created_at)}`}
        actions={
          u.is_admin ? (
            isMe ? (
              <Pill tone="info">You are an admin</Pill>
            ) : (
              <ConfirmButton
                title="Remove admin access?"
                description="They will no longer be able to open the admin panel or change products, offers or orders."
                confirmLabel="Remove access"
                className={btnDanger}
                onConfirm={() => setAdmin.mutateAsync(false).catch(() => undefined)}
              >
                <ShieldOff className="h-4 w-4" /> Remove admin
              </ConfirmButton>
            )
          ) : (
            <ConfirmButton
              title="Make this user an admin?"
              description="Admins can manage products, offers, orders, users and settings."
              confirmLabel="Make admin"
              className={btnPrimary}
              onConfirm={() => setAdmin.mutateAsync(true).catch(() => undefined)}
            >
              <ShieldCheck className="h-4 w-4" /> Make admin
            </ConfirmButton>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Profile" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <Item label="Name" value={u.full_name || "—"} />
            <Item label="Email" value={u.email || "—"} />
            <Item label="Phone" value={u.phone || "—"} />
            <Item label="Role" value={u.is_admin ? "Admin" : "Customer"} />
            <Item label="Orders" value={String(orders.data?.length ?? "…")} />
            <Item label="Total spent" value={formatPrice(spent)} />
          </dl>
        </Panel>
        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-display text-lg tracking-tight text-foreground">Order history</h2>
          {orders.isLoading ? (
            <LoadingState label="Loading orders…" />
          ) : orders.error ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : !orders.data || orders.data.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            orders.data.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                actions={
                  <Link
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Manage order
                  </Link>
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
