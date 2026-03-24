import { useMemo, useState, memo } from "react";
import { Star, ChevronDown, Loader2 } from "lucide-react";
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
import { usePublicReviewsInfinite } from "@/hooks/use-reviews";

interface ReviewSectionProps {
  userId: number;
  initialReviews?: ApiReview[];
  initialStats?: ReviewStats;
  initialNextCursor?: number;
}

const RATING_OPTIONS = [
  { value: "all", label: "All Reviews" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];

// Memoized Review Item Component
const ReviewItem = memo(({ review }: { review: ApiReview }) => {
  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
      {/* Review Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-semibold text-sm">{review.authorName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Review Comment */}
      <p className="text-sm text-foreground/90">{review.comment}</p>
    </div>
  );
});

ReviewItem.displayName = "ReviewItem";

// Skeleton Loader Component
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
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load reviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Reviews</CardTitle>
              {stats.totalReviews > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold">
                    {stats.avgRating.toFixed(1)}
                  </span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
              )}
            </div>
            <CardDescription>
              {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </CardDescription>
          </div>

          {/* Rating Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {RATING_OPTIONS.find((o) => o.value === rating)?.label ||
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

        {/* Stats Display - Only Show Rating Breakdown */}
        {isSuccess && stats.totalReviews > 0 && stats.breakdown && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Rating Breakdown */}
            {[5, 4, 3, 2, 1].map((star) => (
              <div
                key={star}
                className="bg-muted p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => setRating(String(star))}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {star}★
                </div>
                <div className="text-lg font-semibold">
                  {stats.breakdown?.[star as keyof typeof stats.breakdown] ?? 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reviews List */}
        {isEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No reviews found.
          </p>
        ) : isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ReviewSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Fixed Size Scrollable Container - Optimized with Memoized Components */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {displayReviews.map((review: ApiReview) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>

            {/* Load More Button with Prefetch */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full sm:w-auto"
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
              <p className="text-xs text-muted-foreground text-center py-4">
                No more reviews to load
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
