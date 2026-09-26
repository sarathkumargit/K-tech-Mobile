import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useHydrated,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportVibeError } from "../lib/vibe-error-reporting";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { AuthProvider } from "../lib/auth-context";
import { RepairProvider } from "../components/repair-context";
import { RepairModal } from "../components/repair-modal";
import { Toaster } from "../components/ui/sonner";
import { MobileNav, WhatsAppFab } from "../components/mobile-nav";
import { supabaseOrigin } from "../lib/supabase";
import { heroOrigin } from "../lib/hero-image";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-cozy-burnt"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportVibeError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-cozy-burnt"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "K-Tech — Mobile Phones, Accessories & Repairs" },
      {
        name: "description",
        content:
          "K-Tech — your trusted mobile phone shop. Brand new & used phones, accessories, chargers, and expert phone repair. Shop the best deals today.",
      },
      { name: "author", content: "K-Tech" },
      { property: "og:title", content: "K-Tech — Mobile Phones, Accessories & Repairs" },
      {
        property: "og:description",
        content: "Brand new & used phones, accessories, and expert repairs at K-Tech.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23BF360C'/%3E%3Ctext x='16' y='22' font-family='Arial' font-weight='700' font-size='18' fill='white' text-anchor='middle'%3EK%3C/text%3E%3C/svg%3E",
      },
      // Open the connection to Supabase while the page is still loading, so the
      // first data request doesn't pay for a DNS lookup, a TCP handshake and a
      // TLS handshake before it can even ask its question.
      ...(supabaseOrigin
        ? [{ rel: "preconnect", href: supabaseOrigin, crossOrigin: "anonymous" as const }]
        : []),
      // Same idea for the hero picture while it still lives on another server.
      // Disappears by itself once src/assets/hero.webp exists.
      ...(heroOrigin ? [{ rel: "preconnect", href: heroOrigin }] : []),
      {
        rel: "preload",
        href: "/fonts/plus-jakarta-sans.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/sora.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// After a new version is deployed, an already-open tab may ask for old
// code files that no longer exist. Reload once to pick up the new version
// instead of showing an error (guarded so it can never loop).
function useReloadOnStaleChunks() {
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      const key = "ktech:chunk-reload";
      try {
        const last = Number(sessionStorage.getItem(key) ?? 0);
        if (Date.now() - last < 30_000) return;
        sessionStorage.setItem(key, String(Date.now()));
      } catch {
        // storage blocked — still reload once
      }
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);
}

// First paint for every page (the site is served as static files): the
// brand bar and a spinner, drawn instantly from index.html. The real page
// replaces it as soon as the app starts, so the pre-drawn HTML always
// matches what the browser draws first — no hydration errors.
function AppSplash() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cozy-orange to-cozy-burnt shadow-sm">
            <span className="font-display text-lg text-primary-foreground">K</span>
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground">K-TECH</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const hydrated = useHydrated();
  useReloadOnStaleChunks();

  if (!hydrated) return <AppSplash />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RepairProvider>
          {/* Bottom padding on phones keeps the footer clear of the fixed tab bar. */}
          <div className="flex min-h-screen flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
            <Header />
            <main className="min-h-[calc(100svh-4rem)] flex-1">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </main>
            <Footer />
          </div>
          <MobileNav />
          <WhatsAppFab />
          <RepairModal />
          <Toaster position="top-center" richColors closeButton />
        </RepairProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
