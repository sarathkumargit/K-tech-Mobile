import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, LayoutDashboard, LogOut, Package } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { OrderCard } from "@/components/order-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { displayName, useAuth } from "@/lib/auth-context";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { cancelMyOrder, getMyOrders } from "@/services/orderService";
import { updateProfile } from "@/services/userService";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — K-Tech" },
      { name: "description", content: "Your K-Tech profile and orders." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  ),
});

function AccountPage() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const orders = useQuery({
    queryKey: qk.myOrders(userId),
    queryFn: getMyOrders,
    enabled: Boolean(userId),
  });

  const cancel = useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: () => {
      toast.success("Order cancelled");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(readableError(err, "Couldn't cancel the order.")),
  });

  const name = displayName(user, profile);
  const avatar = profile?.avatar_url;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl tracking-tight text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-cozy-burnt px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin panel
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut();
              toast.success("Signed out");
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Profile</h2>
          <ProfileForm />
        </section>

        <section id="orders" className="scroll-mt-20 lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Order History</h2>
          <div className="mt-4 space-y-3">
            {orders.isLoading ? (
              <LoadingState label="Loading your orders…" />
            ) : orders.error ? (
              <ErrorState
                error={orders.error}
                title="Unable to load your orders"
                onRetry={() => orders.refetch()}
              />
            ) : !orders.data || orders.data.length === 0 ? (
              <EmptyState
                icon={<Package className="h-10 w-10" />}
                title="No orders yet"
                description="When you place an order, it'll show up here."
                action={
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
                  >
                    Start Shopping
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            ) : (
              orders.data.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actions={
                    order.status === "pending" && (
                      <button
                        onClick={() => {
                          if (window.confirm("Cancel this order?")) cancel.mutate(order.id);
                        }}
                        disabled={cancel.isPending}
                        className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Cancel order
                      </button>
                    )
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileForm() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, { full_name: fullName.trim() || null, phone: phone.trim() || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.profile(user!.id), updated);
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(readableError(err, "Couldn't save your profile.")),
  });

  if (!profile) return <LoadingState label="Loading profile…" />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="mt-4 space-y-3.5 rounded-2xl border border-border bg-card p-5"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
        <input value={profile.email ?? ""} disabled className={`${inputCls} opacity-60`} />
      </label>
      <button
        type="submit"
        disabled={save.isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-cozy-burnt disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";
