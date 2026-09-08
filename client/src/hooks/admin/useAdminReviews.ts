import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ADMIN_REVIEWS_QUERY_KEY = ["admin-reviews"] as const;

const adminReviewsQueryKey = (
  searchQ: string,
  rating: number | undefined,
  hidden: boolean | undefined,
  cursor: number | undefined,
) => [...ADMIN_REVIEWS_QUERY_KEY, searchQ, rating, hidden, cursor] as const;

export function useAdminReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, [location]);

  const [searchQ, setSearchQ] = useState(() => searchParams.get("q") || "");
  const [reviewRatingFilter, setReviewRatingFilter] = useState(
    () => searchParams.get("rating") || "all",
  );
  const [reviewStatusFilter, setReviewStatusFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [reviewCursor, setReviewCursor] = useState<number | undefined>(
    undefined,
  );
  const [hideReviewDialog, setHideReviewDialog] = useState<{
    reviewId: number;
    isHiding: boolean;
  } | null>(null);
  const [hideReason, setHideReason] = useState("");

  const updateUrlParams = (q: string, rating: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (rating !== "all") params.set("rating", rating);
    if (status !== "all") params.set("status", status);
    const queryString = params.toString();
    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : "/admin/reviews",
    );
  };

  const reviewHiddenFilter = useMemo(() => {
    return reviewStatusFilter === "all"
      ? undefined
      : reviewStatusFilter === "true"
        ? true
        : false;
  }, [reviewStatusFilter]);

  const reviewRating = useMemo(() => {
    return reviewRatingFilter === "all" ? undefined : Number(reviewRatingFilter);
  }, [reviewRatingFilter]);

  const { data: reviewsResponse, isLoading: isReviewsLoading } = useQuery({
    queryKey: adminReviewsQueryKey(
      searchQ,
      reviewRating,
      reviewHiddenFilter,
      reviewCursor,
    ),
    queryFn: () =>
      api.adminGetReviews({
        q: searchQ.trim() || undefined,
        rating: reviewRating,
        hidden: reviewHiddenFilter,
        limit: 20,
        cursor: reviewCursor,
      }),
  });

  const hideReviewMutation = useMutation({
    mutationFn: ({
      id,
      isHidden,
      reason,
    }: {
      id: number;
      isHidden: boolean;
      reason?: string;
    }) => api.adminHideReview(id, isHidden, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_QUERY_KEY });
      toast({
        title: hideReviewDialog?.isHiding ? "Review hidden" : "Review unhidden",
        description: hideReviewDialog?.isHiding
          ? "Review has been hidden from public view."
          : "Review is now visible to public.",
      });
      setHideReviewDialog(null);
      setHideReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReviewPreviousPage = () => {
    setReviewCursor(undefined);
  };

  const handleReviewNextPage = () => {
    if (reviewsResponse?.nextCursor) {
      setReviewCursor(reviewsResponse.nextCursor);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQ(value);
    setReviewCursor(undefined);
    updateUrlParams(value, reviewRatingFilter, reviewStatusFilter);
  };

  const handleRatingFilterChange = (value: string) => {
    setReviewRatingFilter(value);
    setReviewCursor(undefined);
    updateUrlParams(searchQ, value, reviewStatusFilter);
  };

  const handleStatusFilterChange = (value: string) => {
    setReviewStatusFilter(value);
    setReviewCursor(undefined);
    updateUrlParams(searchQ, reviewRatingFilter, value);
  };

  return {
    searchQ,
    reviewRatingFilter,
    reviewStatusFilter,
    reviewCursor,
    hideReviewDialog,
    hideReason,
    reviewsResponse,
    isReviewsLoading,
    hideReviewMutation,
    setHideReviewDialog,
    setHideReason,
    handleReviewPreviousPage,
    handleReviewNextPage,
    handleSearchChange,
    handleRatingFilterChange,
    handleStatusFilterChange,
  };
}
