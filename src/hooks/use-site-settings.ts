import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { qk } from "@/lib/query-keys";
import { setCurrency } from "@/lib/site-config";
import { getSiteSettings } from "@/services/settingsService";

// Shop name, contact details, currency and shipping rule from site_settings.
export function useSiteSettings() {
  const query = useQuery({
    queryKey: qk.settings,
    queryFn: getSiteSettings,
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60 * 10,
  });
  useEffect(() => setCurrency(query.data?.currency), [query.data?.currency]);
  return { settings: query.data ?? null, isLoading: query.isLoading, error: query.error };
}
