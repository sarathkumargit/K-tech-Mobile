import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Menu, User, LogOut, Search, Wrench, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { displayName, useAuth } from "@/lib/auth-context";
import { useRepair } from "@/components/repair-context";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { whatsappLink } from "@/lib/site-config";
import LOGO from "@/assets/logo.jpg";

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
  const navigate = useNavigate();
  const { open: openRepair } = useRepair();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { settings } = useSiteSettings();
  const whatsapp = whatsappLink(
    settings?.whatsapp_number,
    `Hi ${settings?.shop_name ?? "K-Tech"}, I have a question.`,
  );

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };
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
          <img src={LOGO} alt="K-Tech" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
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

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105 sm:flex"
            >
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M16.04 3C8.86 3 3.04 8.8 3.04 15.96c0 2.29.6 4.52 1.74 6.49L3 29l6.73-1.76a13 13 0 0 0 6.3 1.6h.01C23.2 28.84 29 23.04 29 15.88 29 8.73 23.21 3 16.04 3Zm0 23.66h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4 1.04 1.07-3.89-.26-.4a10.7 10.7 0 0 1-1.65-5.71c0-5.95 4.85-10.8 10.8-10.8 5.93 0 10.76 4.83 10.76 10.72 0 5.95-4.86 10.78-10.8 10.78Zm5.92-8.07c-.32-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.74.16-.22.33-.85 1.06-1.04 1.28-.19.22-.38.24-.71.08-.32-.16-1.37-.5-2.6-1.6-.96-.86-1.61-1.91-1.8-2.24-.19-.32-.02-.5.14-.66.15-.15.32-.38.49-.57.16-.19.21-.33.32-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.32-1.14 1.11-1.14 2.72 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.5 5.56 4.9.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38Z" />
              </svg>
            </a>
          )}

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
