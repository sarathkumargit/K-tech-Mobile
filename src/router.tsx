import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SupabaseNotConfiguredError } from "./lib/supabase";

export type RouterContext = {
  queryClient: QueryClient;
};

// Auth state lives only in the browser (Supabase keeps the session in
// localStorage), so it is NOT part of the router context. Pages that need a
// signed-in user wrap their content in <RequireAuth> instead of using
// beforeLoad, which also runs on the server where no session exists.
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Reuse fetched data for 30s: going back to a page is instant and
        // Supabase gets fewer requests. Saving anything refreshes it at once.
        staleTime: 30_000,
        // Retry network hiccups, but not "keys missing" or permission errors.
        retry: (failureCount, error) => {
          if (error instanceof SupabaseNotConfiguredError) return false;
          const code = (error as { code?: string } | null)?.code;
          if (code === "42501" || code === "PGRST116") return false;
          return failureCount < 2;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page when the pointer lands on its link, not when the
    // click happens. A visitor takes a few hundred milliseconds between
    // hovering and clicking, and on a far-away connection that is roughly one
    // round trip — so the page is often already there by the time they click.
    // On a phone this fires on touch-start, which still buys a little.
    defaultPreload: "intent",
    // 100ms of hover, so sweeping the mouse across a grid of product cards
    // doesn't fire a query for every card it passes over.
    defaultPreloadDelay: 100,
    // Let a preloaded page's data actually be used on the click instead of
    // being thrown away and fetched again. Matches the 30s staleTime above.
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
