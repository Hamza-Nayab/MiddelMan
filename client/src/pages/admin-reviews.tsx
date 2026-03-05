import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const reviewStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "false", label: "Visible" },
  { value: "true", label: "Hidden" },
];

const ratingOptions = [
  { value: "all", label: "All Ratings" },
  { value: "1", label: "1 Star" },
  { value: "2", label: "2 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "5", label: "5 Stars" },
];

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewRatingFilter, setReviewRatingFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
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
    return reviewRatingFilter === "all"
      ? undefined
      : Number(reviewRatingFilter);
  }, [reviewRatingFilter]);

  const { data: reviewsResponse, isLoading: isReviewsLoading } = useQuery({
    queryKey: ["admin-reviews", reviewRating, reviewHiddenFilter, reviewCursor],
    queryFn: () =>
      api.adminGetReviews({
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
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
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

  const reviews = reviewsResponse?.items || [];
  const hasNextReviewPage = reviewsResponse?.nextCursor !== null;

  return (
    <AdminLayout currentTab="reviews">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Reviews</CardTitle>
          <CardDescription>Moderate seller reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Select
              value={reviewRatingFilter}
              onValueChange={setReviewRatingFilter}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                {ratingOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={reviewStatusFilter}
              onValueChange={setReviewStatusFilter}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {reviewStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reviews list */}
          {isReviewsLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} className="border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{review.id}
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          {review.isHidden && (
                            <Badge variant="outline">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold">
                          Seller:{" "}
                          {review.sellerDisplayName ||
                            review.sellerUsername ||
                            `#${review.sellerId}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          By: {review.authorName}
                        </p>
                        <p className="text-sm mt-2 line-clamp-2">
                          {review.comment}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {review.isHidden ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setHideReviewDialog({
                              reviewId: review.id,
                              isHiding: false,
                            })
                          }
                          disabled={hideReviewMutation.isPending}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Unhide
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setHideReviewDialog({
                              reviewId: review.id,
                              isHiding: true,
                            })
                          }
                          disabled={hideReviewMutation.isPending}
                        >
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hide
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReviewPreviousPage}
                  disabled={!reviewCursor}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReviewNextPage}
                  disabled={!hasNextReviewPage}
                >
                  Load More
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews found.</p>
          )}
        </CardContent>
      </Card>

      {/* Hide Review Dialog */}
      <AlertDialog
        open={!!hideReviewDialog}
        onOpenChange={() => setHideReviewDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hideReviewDialog?.isHiding ? "Hide Review" : "Unhide Review"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hideReviewDialog?.isHiding
                ? "This review will be hidden from public view. You can optionally provide a reason."
                : "This review will be visible to public again."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {hideReviewDialog?.isHiding && (
            <div className="space-y-4">
              <Textarea
                placeholder="Reason for hiding (optional)..."
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                className="min-h-20"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {hideReason.length}/500
              </p>
            </div>
          )}

          <AlertDialogAction
            onClick={() => {
              if (hideReviewDialog) {
                hideReviewMutation.mutate({
                  id: hideReviewDialog.reviewId,
                  isHidden: hideReviewDialog.isHiding,
                  reason: hideReviewDialog.isHiding ? hideReason : undefined,
                });
              }
            }}
            disabled={hideReviewMutation.isPending}
          >
            {hideReviewDialog?.isHiding ? "Hide Review" : "Unhide Review"}
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
