import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const profileBundleQueryKey = (username?: string) =>
  ["profile-bundle", username] as const;

export const givenReviewsQueryKey = ["given-reviews"] as const;

export function useProfileBundleQuery(username?: string) {
  return useQuery({
    queryKey: profileBundleQueryKey(username),
    queryFn: () => api.getPublicProfileBundle(username!, { track: false }),
    enabled: !!username,
    retry: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useGivenReviewsQuery(enabled = true) {
  return useQuery({
    queryKey: givenReviewsQueryKey,
    queryFn: api.getGivenReviews,
    enabled,
    retry: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
