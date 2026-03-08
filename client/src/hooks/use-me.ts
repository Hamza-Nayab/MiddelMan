import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const meQueryKey = ["me"] as const;

export function useMeQuery() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: api.getMe,
    retry: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
