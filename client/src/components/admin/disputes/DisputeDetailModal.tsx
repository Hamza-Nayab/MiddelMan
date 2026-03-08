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

type DisputeDetailModalProps = {
  resolveDialog: {
    disputeId: number;
    outcome: "valid" | "rejected" | null;
  } | null;
  setResolveDialog: (value: { disputeId: number; outcome: "valid" | "rejected" | null } | null) => void;
  resolutionNote: string;
  setResolutionNote: (value: string) => void;
  hideReviewOnResolve: boolean;
  setHideReviewOnResolve: (value: boolean) => void;
  onResolve: (payload: {
    id: number;
    outcome: "valid" | "rejected";
    resolutionNote?: string;
    hideReview?: boolean;
  }) => void;
  isResolvePending: boolean;
};

export function DisputeDetailModal({
  resolveDialog,
  setResolveDialog,
  resolutionNote,
  setResolutionNote,
  hideReviewOnResolve,
  setHideReviewOnResolve,
  onResolve,
  isResolvePending,
}: DisputeDetailModalProps) {
  return (
    <AlertDialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolveDialog?.outcome === "valid" ? "Mark as Valid Dispute" : "Reject Dispute"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resolveDialog?.outcome === "valid"
              ? "This will mark the dispute as valid and optionally hide the review."
              : "This will reject the dispute."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Resolution Note (optional)</label>
            <Textarea
              placeholder="Add a reason or explanation..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="mt-2 min-h-20"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {resolutionNote.length}/1000
            </p>
          </div>

          {resolveDialog?.outcome === "valid" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hide-review"
                checked={hideReviewOnResolve}
                onChange={(e) => setHideReviewOnResolve(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="hide-review" className="text-sm cursor-pointer">
                Hide the review from public view
              </label>
            </div>
          )}
        </div>

        <AlertDialogAction
          onClick={() => {
            if (resolveDialog) {
              onResolve({
                id: resolveDialog.disputeId,
                outcome: resolveDialog.outcome || "rejected",
                resolutionNote: resolutionNote || undefined,
                hideReview:
                  resolveDialog.outcome === "valid" ? hideReviewOnResolve : undefined,
              });
            }
          }}
          disabled={isResolvePending}
        >
          {resolveDialog?.outcome === "valid" ? "Mark Valid" : "Reject Dispute"}
        </AlertDialogAction>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
