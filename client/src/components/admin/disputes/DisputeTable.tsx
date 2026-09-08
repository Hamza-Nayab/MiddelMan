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
  currentPage?: number;
  hasPreviousPage?: boolean;
  hasNextDisputePage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onResolveValid: (disputeId: number) => void;
  onResolveRejected: (disputeId: number) => void;
  onDeleteEvidence: (disputeId: number) => void;
  isResolvePending: boolean;
  isDeleteEvidencePending: boolean;
};

function renderDisputeStatusBadge(status: string) {
  if (status === "open") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 font-medium"
      >
        Open
      </Badge>
    );
  }
  if (status === "resolved_valid") {
    return (
      <Badge
        variant="default"
        className="bg-rose-600 text-white hover:bg-rose-600 border-transparent font-medium shadow-xs"
      >
        Valid Dispute
      </Badge>
    );
  }
  if (status === "resolved_rejected") {
    return (
      <Badge
        variant="outline"
        className="bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-medium"
      >
        Rejected
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

export const DisputeTable = memo(function DisputeTable({
  disputes,
  isDisputesLoading,
  currentPage = 1,
  hasPreviousPage = false,
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
                  {renderDisputeStatusBadge(dispute.status)}
                </div>
                <div className="mt-2 text-sm space-y-1.5">
                  <p className="font-semibold text-foreground">
                    Seller:{" "}
                    <span className="font-normal text-foreground">
                      {dispute.seller?.displayName ||
                        dispute.seller?.username ||
                        `#${dispute.sellerId}`}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Reason:</span>{" "}
                    <span className="text-foreground/90">{dispute.reason}</span>
                  </p>
                  {dispute.message && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Message:</span>{" "}
                      <span className="text-foreground/90">{dispute.message}</span>
                    </p>
                  )}
                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-md text-xs">
                    <p className="font-semibold text-foreground mb-1">
                      Review (⭐{dispute.review?.rating || "-"}):
                    </p>
                    <p className="text-foreground/90 italic line-clamp-2">
                      &quot;{dispute.review?.comment}&quot;
                    </p>
                  </div>
                  {dispute.resolutionNote && (
                    <p className="text-xs text-foreground mt-2">
                      <span className="font-semibold text-muted-foreground">Resolution:</span>{" "}
                      <span className="text-foreground font-medium">
                        {dispute.resolutionNote}
                      </span>
                    </p>
                  )}

                  <div className="mt-2.5 p-2.5 rounded-md text-xs bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                    {dispute.evidenceUrl ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            📎 Evidence Attached
                          </p>
                          <span className="text-muted-foreground text-[11px] font-mono">
                            {dispute.evidenceMime || "Unknown type"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <a
                            href={dispute.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Evidence
                          </a>
                          <a
                            href={dispute.evidenceUrl}
                            download
                            className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 text-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs italic">
                        No evidence attached to this dispute
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              {dispute.status === "open" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                    onClick={() => onResolveValid(dispute.id)}
                    disabled={isResolvePending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                    Valid Dispute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                    onClick={() => onResolveRejected(dispute.id)}
                    disabled={isResolvePending}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
                    Reject
                  </Button>
                </>
              )}
              {dispute.evidenceUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => onDeleteEvidence(dispute.id)}
                  disabled={isDeleteEvidencePending}
                >
                  {isDeleteEvidencePending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Delete Evidence
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage || isDisputesLoading}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground font-medium">
          Page {currentPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextDisputePage || isDisputesLoading}
        >
          {isDisputesLoading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : null}
          Next
        </Button>
      </div>
    </div>
  );
});
