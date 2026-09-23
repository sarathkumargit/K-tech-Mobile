import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Menu, User, LogOut, Search, Wrench, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { displayName, useAuth } from "@/lib/auth-context";
import { useRepair } from "@/components/repair-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const { totals } = useCart();
  const count = totals.count;
  const { user, profile, isAdmin, signOut } = useAuth();
  const name = displayName(user, profile);
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };
  const { open: openRepair } = useRepair();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setOpen(false);
    navigate({ to: "/shop", search: q ? { search: q } : {} });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cozy-orange to-cozy-burnt shadow-sm">
            <span className="font-display text-lg text-primary-foreground">K</span>
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground">K-TECH</span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={submitSearch} className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phones, brands, accessories…"
            className="w-full rounded-full border border-input bg-secondary/60 py-2 pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:bg-card"
          />
        </form>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => {
            const active = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "text-sm font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openRepair}
            className="hidden items-center gap-1.5 rounded-full bg-cozy-burnt px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-105 sm:flex"
          >
            <Wrench className="h-3.5 w-3.5" />
            Repair
          </button>

          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {user ? (
            <div className="hidden items-center gap-1 sm:flex">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-cozy-burnt transition-colors hover:bg-accent"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Link
                to="/account"
                className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="max-w-24 truncate">{name}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
              aria-label="Sign in"
            >
              <User className="h-5 w-5" />
            </Link>
          )}

          <Link
            to="/cart"
            className="relative hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-border bg-background px-4 py-3 md:hidden"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phones, brands, accessories…"
              className="w-full rounded-full border border-input bg-secondary/60 py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        </form>
      )}

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              openRepair();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-cozy-burnt px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground"
          >
            <Wrench className="h-4 w-4" />
            Phone Repair
          </button>
          <div className="mt-2 border-t border-border pt-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 text-sm font-semibold text-cozy-burnt"
                  >
                    Admin panel
                  </Link>
                )}
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  My Account
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="block py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
