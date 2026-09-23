import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getOrderStatuses } from "@/services/orderService";

// Order statuses come from the order_statuses table.
export function useOrderStatuses() {
  const query = useQuery({
    queryKey: qk.orderStatuses,
    queryFn: getOrderStatuses,
    staleTime: 1000 * 60 * 30,
  });
  const statuses = query.data ?? [];
  const label = (code: string) => statuses.find((s) => s.code === code)?.label ?? code;
  return { statuses, label, isLoading: query.isLoading };
}
