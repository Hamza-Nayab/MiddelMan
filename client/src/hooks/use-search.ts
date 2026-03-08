import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const searchQueryKey = (query: string) => ["search", query] as const;
export const searchSuggestQueryKey = (query: string) =>
  ["search-suggest", query] as const;

export function useSearch(query: string) {
  const normalizedQuery = query.trim();

  const searchQuery = useInfiniteQuery({
    queryKey: searchQueryKey(normalizedQuery),
    queryFn: ({ pageParam = 0, signal }) =>
      api.search(normalizedQuery, {
        limit: 15,
        offset: Number(pageParam),
        signal,
      }),
    enabled: normalizedQuery.length >= 2,
    initialPageParam: 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasMore ? lastPage.meta.nextOffset : undefined,
  });

  const suggestQuery = useQuery({
    queryKey: searchSuggestQueryKey(normalizedQuery),
    queryFn: ({ signal }) => api.searchSuggest(normalizedQuery, { signal }),
    enabled: normalizedQuery.length >= 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const results = searchQuery.data?.pages.flatMap((page) => page.results) ?? [];
  const suggestions = suggestQuery.data?.suggestions ?? [];

  return {
    ...searchQuery,
    results,
    suggestions,
  };
}
