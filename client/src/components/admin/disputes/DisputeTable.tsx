import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";

type DisputeTableProps = {
  disputes: any[];
  isDisputesLoading: boolean;
  disputeCursor?: number;
  hasNextDisputePage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onResolveValid: (disputeId: number) => void;
  onResolveRejected: (disputeId: number) => void;
  onDeleteEvidence: (disputeId: number) => void;
  isResolvePending: boolean;
  isDeleteEvidencePending: boolean;
};

export const DisputeTable = memo(function DisputeTable({
  disputes,
  isDisputesLoading,
  disputeCursor,
  hasNextDisputePage,
  onPreviousPage,
  onNextPage,
  onResolveValid,
  onResolveRejected,
  onDeleteEvidence,
  isResolvePending,
  isDeleteEvidencePending,
}: DisputeTableProps) {
  if (isDisputesLoading) {
    return <p className="text-sm text-muted-foreground">Loading disputes...</p>;
  }

  if (!disputes.length) {
    return <p className="text-sm text-muted-foreground">No disputes found.</p>;
  }

  return (
    <div className="space-y-3">
      {disputes.map((dispute) => (
        <Card key={dispute.id} className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">
                    #{dispute.id}
                  </span>
                  <Badge
                    variant={
                      dispute.status === "open"
                        ? "outline"
                        : dispute.status === "resolved_valid"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {dispute.status === "open"
                      ? "Open"
                      : dispute.status === "resolved_valid"
                        ? "Valid Dispute"
                        : "Rejected"}
                  </Badge>
                </div>
                <div className="mt-2 text-sm">
                  <p className="font-semibold">
                    Seller: {dispute.seller?.displayName || dispute.seller?.username || `#${dispute.sellerId}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Reason: {dispute.reason}</p>
                  {dispute.message && (
                    <p className="text-sm text-muted-foreground mt-1">Message: {dispute.message}</p>
                  )}
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <p className="font-semibold">Review (⭐{dispute.review?.rating || "-"}):</p>
                    <p className="text-muted-foreground line-clamp-1">
                      &quot;{dispute.review?.comment}&quot;
                    </p>
                  </div>
                  {dispute.resolutionNote && (
                    <p className="text-xs mt-2">Resolution: {dispute.resolutionNote}</p>
                  )}

                  <div className="mt-2 p-2 bg-secondary/10 dark:bg-secondary/5 border border-secondary text-xs rounded">
                    {dispute.evidenceUrl ? (
                      <>
                        <p className="font-semibold text-foreground dark:text-secondary mb-1">
                          📎 Evidence Attached
                        </p>
                        <p className="text-primary dark:text-secondary text-xs mb-2">
                          Type: {dispute.evidenceMime || "Unknown"}
                        </p>
                        <div className="flex gap-2">
                          <a
                            href={dispute.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Evidence
                          </a>
                          <a
                            href={dispute.evidenceUrl}
                            download
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="text-blue-700 dark:text-blue-300 text-xs">
                        No evidence attached to this dispute
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {dispute.status === "open" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveValid(dispute.id)}
                    disabled={isResolvePending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valid Dispute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveRejected(dispute.id)}
                    disabled={isResolvePending}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {dispute.evidenceUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteEvidence(dispute.id)}
                  disabled={isDeleteEvidencePending}
                >
                  {isDeleteEvidencePending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Delete Evidence
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={onPreviousPage} disabled={!disputeCursor}>
          Previous
        </Button>
        <Button variant="outline" onClick={onNextPage} disabled={!hasNextDisputePage}>
          Load More
        </Button>
      </div>
    </div>
  );
});
