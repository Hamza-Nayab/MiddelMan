import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ADMIN_REVIEWS_QUERY_KEY = ["admin-reviews"] as const;

const adminReviewsQueryKey = (
  rating: number | undefined,
  sellerId: number | undefined,
  hidden: boolean | undefined,
  cursor: number | undefined,
) => [...ADMIN_REVIEWS_QUERY_KEY, rating, sellerId, hidden, cursor] as const;

export function useAdminReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewRatingFilter, setReviewRatingFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("");
  const [reviewCursor, setReviewCursor] = useState<number | undefined>(
    undefined,
  );
  const [hideReviewDialog, setHideReviewDialog] = useState<{
    reviewId: number;
    isHiding: boolean;
  } | null>(null);
  const [hideReason, setHideReason] = useState("");

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

  const sellerIdFilter = useMemo(() => {
    const trimmed = sellerFilter.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [sellerFilter]);

  const { data: reviewsResponse, isLoading: isReviewsLoading } = useQuery({
    queryKey: adminReviewsQueryKey(
      reviewRating,
      sellerIdFilter,
      reviewHiddenFilter,
      reviewCursor,
    ),
    queryFn: () =>
      api.adminGetReviews({
        rating: reviewRating,
        sellerId: sellerIdFilter,
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

  const handleRatingFilterChange = (value: string) => {
    setReviewRatingFilter(value);
    setReviewCursor(undefined);
  };

  const handleStatusFilterChange = (value: string) => {
    setReviewStatusFilter(value);
    setReviewCursor(undefined);
  };

  const handleSellerFilterChange = (value: string) => {
    setSellerFilter(value);
    setReviewCursor(undefined);
  };

  return {
    reviewRatingFilter,
    reviewStatusFilter,
    sellerFilter,
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
    handleRatingFilterChange,
    handleStatusFilterChange,
    handleSellerFilterChange,
  };
}
