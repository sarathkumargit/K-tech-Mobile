import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, Pill, inputCls } from "@/components/admin/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { formatDate } from "@/lib/site-config";
import { adminListUsers } from "@/services/userService";

export const Route = createFileRoute("/admin/users/")({ component: UsersPage });

function UsersPage() {
  const users = useQuery({ queryKey: qk.admin.users, queryFn: adminListUsers });
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.data ?? [];
    return (users.data ?? []).filter((u) =>
      [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [users.data, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Everyone with an account. Open a user to see their orders or change admin access."
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className={`${inputCls} pl-9`}
        />
      </div>
      {users.isLoading ? (
        <LoadingState label="Loading users…" />
      ) : users.error ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title={search ? "No users match your search" : "No users yet"} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((u) => (
            <li key={u.id}>
              <Link
                to="/admin/users/$id"
                params={{ id: u.id }}
                className="flex items-center gap-3 p-3 hover:bg-secondary/40"
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground">
                    {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {u.full_name || "No name"} {u.is_admin && <Pill tone="info">Admin</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  Joined {formatDate(u.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
