import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Wrench,
  Settings,
} from "lucide-react";
import { RequireAdmin } from "@/components/require-auth";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/offers", label: "Offers", icon: Tag },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — K-Tech" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  ),
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:flex lg:gap-8 lg:px-8">
      <aside className="lg:w-52 lg:shrink-0">
        <p className="hidden px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground lg:block">
          Admin
        </p>
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:mt-2 lg:flex-col lg:px-0">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{
                className:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="mt-4 min-w-0 flex-1 lg:mt-0">
        <Outlet />
      </div>
    </div>
  );
}
