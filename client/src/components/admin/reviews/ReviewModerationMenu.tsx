import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

type ReviewModerationMenuProps = {
  review: {
    id: number;
    isHidden: boolean;
  };
  onToggleHide: (payload: { reviewId: number; isHiding: boolean }) => void;
  isPending: boolean;
};

export const ReviewModerationMenu = memo(function ReviewModerationMenu({
  review,
  onToggleHide,
  isPending,
}: ReviewModerationMenuProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t">
      {review.isHidden ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onToggleHide({
              reviewId: review.id,
              isHiding: false,
            })
          }
          disabled={isPending}
        >
          <Eye className="w-3 h-3 mr-1" />
          Unhide
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onToggleHide({
              reviewId: review.id,
              isHiding: true,
            })
          }
          disabled={isPending}
        >
          <EyeOff className="w-3 h-3 mr-1" />
          Hide
        </Button>
      )}
    </div>
  );
});
