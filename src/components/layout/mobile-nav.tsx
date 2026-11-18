// Phone-sized screens: a fixed bottom tab bar (Home · Shop · Cart · Orders ·
// Account) plus a floating WhatsApp button. Hidden from tablet width up,
// where the header shows the full navigation.
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Package, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useAuth } from "@/lib/auth-context";
import { whatsappLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type Tab = {
  to: "/" | "/shop" | "/cart" | "/account" | "/login";
  label: string;
  icon: LucideIcon;
  hash?: string | undefined;
  match: (path: string, hash: string) => boolean;
};

export function MobileNav() {
  const { totals } = useCart();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  const tabs: Tab[] = [
    { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
    {
      to: "/shop",
      label: "Shop",
      icon: LayoutGrid,
      match: (p) => p.startsWith("/shop") || p.startsWith("/product"),
    },
    {
      to: "/cart",
      label: "Cart",
      icon: ShoppingBag,
      match: (p) => p.startsWith("/cart") || p.startsWith("/checkout"),
    },
    {
      to: user ? "/account" : "/login",
      hash: user ? "orders" : undefined,
      label: "Orders",
      icon: Package,
      match: (p, h) => p === "/account" && h === "orders",
    },
    {
      to: user ? "/account" : "/login",
      label: user ? "Account" : "Sign in",
      icon: User,
      match: (p, h) =>
        (p === "/account" && h !== "orders") ||
        p.startsWith("/login") ||
        p.startsWith("/signup") ||
        p.startsWith("/admin"),
    },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map(({ to, hash: tabHash, label, icon: Icon, match }) => {
          const active = match(pathname, hash);
          return (
            <li key={label}>
              <Link
                to={to}
                {...(tabHash ? { hash: tabHash } : {})}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {label === "Cart" && totals.count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                      {totals.count > 99 ? "99+" : totals.count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Floating "chat on WhatsApp" button (number from Admin → Settings).
export function WhatsAppFab() {
  const { settings } = useSiteSettings();
  const link = whatsappLink(
    settings?.whatsapp_number,
    `Hi ${settings?.shop_name ?? "K-Tech"}, I have a question.`,
  );
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 md:bottom-6 md:left-6"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C8.86 3 3.04 8.8 3.04 15.96c0 2.29.6 4.52 1.74 6.49L3 29l6.73-1.76a13 13 0 0 0 6.3 1.6h.01C23.2 28.84 29 23.04 29 15.88 29 8.73 23.21 3 16.04 3Zm0 23.66h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4 1.04 1.07-3.89-.26-.4a10.7 10.7 0 0 1-1.65-5.71c0-5.95 4.85-10.8 10.8-10.8 5.93 0 10.76 4.83 10.76 10.72 0 5.95-4.86 10.78-10.8 10.78Zm5.92-8.07c-.32-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.74.16-.22.33-.85 1.06-1.04 1.28-.19.22-.38.24-.71.08-.32-.16-1.37-.5-2.6-1.6-.96-.86-1.61-1.91-1.8-2.24-.19-.32-.02-.5.14-.66.15-.15.32-.38.49-.57.16-.19.21-.33.32-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.32-1.14 1.11-1.14 2.72 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.5 5.56 4.9.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38Z" />
      </svg>
    </a>
  );
}
