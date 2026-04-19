import { memo, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Review as ApiReview, ReviewStats } from "@/lib/api";
import type { ResolvedProfileAppearance } from "@/lib/profile-appearance";
import { usePublicReviewsInfinite } from "@/hooks/use-reviews";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReviewSectionProps {
  userId: number;
  initialReviews?: ApiReview[];
  initialStats?: ReviewStats;
  initialNextCursor?: number;
  appearance?: ResolvedProfileAppearance | null;
  canReport?: boolean;
  onReportReview?: (reviewId: number, payload: { reason: string; message?: string }) => void;
  isSubmittingReport?: boolean;
}

const RATING_OPTIONS = [
  { value: "all", label: "All Reviews" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];

const getSurfaceHoverClass = (
  appearance?: ResolvedProfileAppearance | null,
) => {
  if (!appearance) return "hover:bg-muted/50";
  if (appearance.usesDynamicBackground) {
    return appearance.usesBrightBackground
      ? "hover:bg-white/90"
      : "hover:bg-white/20";
  }
  return appearance.theme === "dark" ? "hover:bg-slate-800" : "hover:bg-muted/50";
};

const ReviewItem = memo(
  ({
    review,
    appearance,
    canReport,
    onReportReview,
    isSubmittingReport,
  }: {
    review: ApiReview;
    appearance?: ResolvedProfileAppearance | null;
    canReport?: boolean;
    onReportReview?: (reviewId: number, payload: { reason: string; message?: string }) => void;
    isSubmittingReport?: boolean;
  }) => {
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportMessage, setReportMessage] = useState("");
    return (
      <div
        className={cn(
          "border rounded-lg p-4 space-y-2 transition-colors",
          appearance?.surfaceMutedClass,
          getSurfaceHoverClass(appearance),
        )}
        style={appearance?.accentCardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p
              className={cn(
                "font-semibold text-sm",
                appearance?.primaryTextClass,
              )}
            >
              {review.authorName}
            </p>
            <p className={cn("text-xs text-muted-foreground", appearance?.mutedTextClass)}>
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={cn(
                  "w-4 h-4",
                  index < review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : appearance?.mutedTextClass ?? "text-muted-foreground",
                )}
              />
            ))}
          </div>
        </div>

        <p
          className={cn(
            "text-sm text-foreground/90",
            appearance?.primaryTextClass,
          )}
        >
          {review.comment}
        </p>

        {review.sellerResponse ? (
          <div className={cn("rounded-md border p-3", appearance?.surfaceClass)}>
            <p className={cn("text-xs font-semibold mb-1", appearance?.mutedTextClass)}>
              Seller response
            </p>
            <p className={cn("text-sm", appearance?.primaryTextClass)}>
              {review.sellerResponse}
            </p>
          </div>
        ) : null}

        {canReport && onReportReview ? (
          <div className="flex justify-end">
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <input
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="Reason"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  />
                  <Textarea
                    value={reportMessage}
                    onChange={(event) => setReportMessage(event.target.value)}
                    placeholder="Add context (optional)"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsReportOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmittingReport || !reportReason.trim()}
                      onClick={() => {
                        onReportReview(review.id, {
                          reason: reportReason.trim(),
                          message: reportMessage.trim() || undefined,
                        });
                        setIsReportOpen(false);
                        setReportReason("");
                        setReportMessage("");
                      }}
                    >
                      {isSubmittingReport ? "Sending..." : "Submit Report"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>
    );
  },
);

ReviewItem.displayName = "ReviewItem";

const ReviewSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
    <Skeleton className="h-12 w-full" />
  </div>
);

export function ReviewsSection({
  userId,
  initialReviews,
  initialStats,
  initialNextCursor,
  appearance,
  canReport,
  onReportReview,
  isSubmittingReport,
}: ReviewSectionProps) {
  const [rating, setRating] = useState("all");
  const seededStats = useMemo(() => {
    if (
      initialStats?.breakdown ||
      !initialStats ||
      !initialReviews ||
      initialStats.totalReviews !== initialReviews.length
    ) {
      return initialStats;
    }

    const breakdown: NonNullable<ReviewStats["breakdown"]> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const review of initialReviews) {
      breakdown[review.rating as keyof typeof breakdown] += 1;
    }

    return {
      ...initialStats,
      breakdown,
    };
  }, [initialReviews, initialStats]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    isPending,
    isSuccess,
  } = usePublicReviewsInfinite(userId, rating, {
    reviews: initialReviews ?? [],
    stats:
      seededStats ?? {
        avgRating: 0,
        totalReviews: 0,
      },
    nextCursor: initialNextCursor,
  });

  const displayReviews = data?.pages.flatMap((page: any) => page.reviews) ?? [];

  const stats = data?.pages[0]?.stats ?? {
    avgRating: 0,
    totalReviews: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  const isEmpty = isSuccess && displayReviews.length === 0;

  if (isError) {
    return (
      <Card
        className={cn(appearance?.surfaceClass)}
        style={appearance?.accentCardStyle}
      >
        <CardHeader>
          <CardTitle className={cn(appearance?.primaryTextClass)}>
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-sm text-muted-foreground", appearance?.mutedTextClass)}>
            Failed to load reviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(appearance?.surfaceClass)}
      style={appearance?.accentCardStyle}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={cn(appearance?.primaryTextClass)}>
                Reviews
              </CardTitle>
              {stats.totalReviews > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    appearance?.primaryTextClass,
                  )}
                >
                  <span className="font-semibold">
                    {stats.avgRating.toFixed(1)}
                  </span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
              )}
            </div>
            <CardDescription className={cn(appearance?.mutedTextClass)}>
              {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("flex items-center gap-2", appearance?.buttonClass)}
                style={appearance?.accentButtonStyle}
              >
                {RATING_OPTIONS.find((option) => option.value === rating)?.label ||
                  "Filter"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {RATING_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setRating(option.value)}
                  className={rating === option.value ? "bg-muted" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isSuccess && stats.totalReviews > 0 && stats.breakdown && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div
                key={star}
                className={cn(
                  "rounded-lg border p-3 cursor-pointer transition-colors",
                  appearance?.surfaceMutedClass ?? "bg-muted",
                  getSurfaceHoverClass(appearance),
                )}
                style={appearance?.accentCardStyle}
                onClick={() => setRating(String(star))}
              >
                <div className={cn("text-xs mb-1", appearance?.mutedTextClass)}>
                  {star}★
                </div>
                <div className={cn("text-lg font-semibold", appearance?.primaryTextClass)}>
                  {stats.breakdown?.[star as keyof typeof stats.breakdown] ?? 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <p className={cn("text-sm text-center py-8", appearance?.mutedTextClass)}>
            No reviews found.
          </p>
        ) : isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ReviewSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {displayReviews.map((review: ApiReview) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  appearance={appearance}
                  canReport={canReport}
                  onReportReview={onReportReview}
                  isSubmittingReport={isSubmittingReport}
                />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className={cn("w-full sm:w-auto", appearance?.buttonClass)}
                  style={appearance?.accentButtonStyle}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Reviews"
                  )}
                </Button>
              </div>
            )}

            {!hasNextPage && displayReviews.length > 0 && (
              <p className={cn("text-xs text-center py-4", appearance?.mutedTextClass)}>
                No more reviews to load
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
