import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeOff, Star } from "lucide-react";
import { ReviewModerationMenu } from "./ReviewModerationMenu";

type ReviewTableProps = {
  reviews: any[];
  isReviewsLoading: boolean;
  reviewCursor?: number;
  hasNextReviewPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onToggleHide: (payload: { reviewId: number; isHiding: boolean }) => void;
  isModerationPending: boolean;
};

export const ReviewTable = memo(function ReviewTable({
  reviews,
  isReviewsLoading,
  reviewCursor,
  hasNextReviewPage,
  onPreviousPage,
  onNextPage,
  onToggleHide,
  isModerationPending,
}: ReviewTableProps) {
  if (isReviewsLoading) {
    return <p className="text-sm text-muted-foreground">Loading reviews...</p>;
  }

  if (!reviews.length) {
    return <p className="text-sm text-muted-foreground">No reviews found.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id} className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">#{review.id}</span>
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
                  Seller: {review.sellerDisplayName || review.sellerUsername || `#${review.sellerId}`}
                </p>
                <p className="text-sm text-muted-foreground">By: {review.authorName}</p>
                <p className="text-sm mt-2 line-clamp-2">{review.comment}</p>
              </div>
            </div>

            <ReviewModerationMenu
              review={review}
              onToggleHide={onToggleHide}
              isPending={isModerationPending}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={onPreviousPage} disabled={!reviewCursor}>
          Previous
        </Button>
        <Button variant="outline" onClick={onNextPage} disabled={!hasNextReviewPage}>
          Load More
        </Button>
      </div>
    </div>
  );
});
