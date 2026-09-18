import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, type PublicProfileBundleResponse } from "@/lib/api";

export const profileBundleQueryKey = (username?: string) =>
  ["profile-bundle", username] as const;

type ProfileBundleOptions = {
  limit?: number;
};

export const givenReviewsQueryKey = ["given-reviews"] as const;

function getInitialProfileBundle(
  username?: string,
): PublicProfileBundleResponse | null {
  if (typeof window === "undefined" || !username) return null;
  try {
    const el = document.getElementById("__INITIAL_PROFILE_BUNDLE__");
    if (!el || !el.textContent) return null;
    const data = JSON.parse(el.textContent) as PublicProfileBundleResponse;
    if (
      data &&
      data.user &&
      typeof data.user.username === "string" &&
      data.user.username.toLowerCase() === username.toLowerCase()
    ) {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

export function useProfileBundleQuery(
  username?: string,
  options?: ProfileBundleOptions,
) {
  const initialData = useMemo(
    () => getInitialProfileBundle(username),
    [username],
  );

  return useQuery({
    queryKey: [...profileBundleQueryKey(username), options?.limit] as const,
    queryFn: () =>
      api.getPublicProfileBundle(username!, {
        track: false,
        limit: options?.limit,
      }),
    initialData: initialData || undefined,
    enabled: !!username,
    retry: 1,
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
