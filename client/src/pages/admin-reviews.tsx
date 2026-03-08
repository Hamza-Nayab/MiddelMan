import { useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ReviewFilters } from "@/components/admin/reviews/ReviewFilters";
import { ReviewTable } from "@/components/admin/reviews/ReviewTable";
import { useAdminReviews } from "@/hooks/admin/useAdminReviews";

export default function AdminReviewsPage() {
  const {
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
  } = useAdminReviews();

  const reviews = useMemo(() => reviewsResponse?.items ?? [], [reviewsResponse?.items]);
  const hasNextReviewPage = reviewsResponse?.nextCursor !== null;

  const handleToggleHide = useCallback(
    ({ reviewId, isHiding }: { reviewId: number; isHiding: boolean }) => {
      setHideReviewDialog({
        reviewId,
        isHiding,
      });
    },
    [setHideReviewDialog],
  );

  return (
    <AdminLayout currentTab="reviews">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Reviews</CardTitle>
          <CardDescription>Moderate seller reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewFilters
            reviewRatingFilter={reviewRatingFilter}
            reviewStatusFilter={reviewStatusFilter}
            sellerFilter={sellerFilter}
            onRatingChange={handleRatingFilterChange}
            onStatusChange={handleStatusFilterChange}
            onSellerChange={handleSellerFilterChange}
          />

          <ReviewTable
            reviews={reviews}
            isReviewsLoading={isReviewsLoading}
            reviewCursor={reviewCursor}
            hasNextReviewPage={hasNextReviewPage}
            onPreviousPage={handleReviewPreviousPage}
            onNextPage={handleReviewNextPage}
            onToggleHide={handleToggleHide}
            isModerationPending={hideReviewMutation.isPending}
          />
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
