import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const profileBundleQueryKey = (username?: string) =>
  ["profile-bundle", username] as const;

type ProfileBundleOptions = {
  limit?: number;
};

export const givenReviewsQueryKey = ["given-reviews"] as const;

export function useProfileBundleQuery(
  username?: string,
  options?: ProfileBundleOptions,
) {
  return useQuery({
    queryKey: [...profileBundleQueryKey(username), options?.limit] as const,
    queryFn: () =>
      api.getPublicProfileBundle(username!, {
        track: false,
        limit: options?.limit,
      }),
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
