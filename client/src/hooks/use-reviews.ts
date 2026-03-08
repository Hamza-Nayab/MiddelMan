import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const publicReviewsQueryKey = (userId: number, rating: string) =>
  ["reviews", userId, rating] as const;

type PublicReviewsPage = Awaited<ReturnType<typeof api.getPublicReviews>>;

export function usePublicReviewsInfinite(userId: number, rating: string) {
  const queryClient = useQueryClient();

  const queryKey = publicReviewsQueryKey(userId, rating);
  const queryFn = ({ pageParam }: { pageParam: number | undefined }) =>
    api.getPublicReviews(userId, {
      rating: rating === "all" ? undefined : rating,
      cursor: pageParam,
      limit: 5,
    });

  const query = useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage: PublicReviewsPage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
    staleTime: 1000 * 60 * 5,
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const prefetchNextPage = () =>
    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn,
      getNextPageParam: (lastPage: PublicReviewsPage) =>
        lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as number | undefined,
      staleTime: 1000 * 60 * 5,
    });

  return {
    ...query,
    prefetchNextPage,
  };
}
