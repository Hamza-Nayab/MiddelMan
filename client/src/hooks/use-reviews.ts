import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const publicReviewsQueryKey = (userId: number, rating: string) =>
  ["reviews", userId, rating] as const;

type PublicReviewsPage = Awaited<ReturnType<typeof api.getPublicReviews>>;

type InitialPublicReviewsPage = Pick<
  PublicReviewsPage,
  "reviews" | "stats" | "nextCursor"
>;

export function usePublicReviewsInfinite(
  userId: number,
  rating: string,
  initialPage?: InitialPublicReviewsPage,
) {
  const queryClient = useQueryClient();

  const queryKey = publicReviewsQueryKey(userId, rating);
  const queryFn = ({ pageParam }: { pageParam: number | undefined }) =>
    api.getPublicReviews(userId, {
      rating: rating === "all" ? undefined : rating,
      cursor: pageParam,
      limit: 5,
    });

  const seededInitialPage =
    rating === "all" && initialPage
      ? {
          reviews: initialPage.reviews,
          stats: initialPage.stats,
          ...(initialPage.nextCursor
            ? { nextCursor: initialPage.nextCursor }
            : {}),
        }
      : undefined;

  const query = useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage: PublicReviewsPage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
    staleTime: 1000 * 60 * 5,
    initialData: seededInitialPage
      ? {
          pages: [seededInitialPage],
          pageParams: [undefined as number | undefined],
        }
      : undefined,
    enabled: Number.isFinite(userId) && userId > 0 && !seededInitialPage,
  });

  return {
    ...query,
    prefetchNextPage: () =>
      queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn,
        getNextPageParam: (lastPage: PublicReviewsPage) =>
          lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as number | undefined,
        staleTime: 1000 * 60 * 5,
      }),
  };
}
