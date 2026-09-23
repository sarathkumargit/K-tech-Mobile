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
    defaultPreloadStaleTime: 0,
  });

  return router;
};
