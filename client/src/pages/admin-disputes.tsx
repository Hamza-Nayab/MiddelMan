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
import {
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const disputeStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "resolved_valid", label: "Valid Dispute" },
  { value: "resolved_rejected", label: "Rejected" },
];

export default function AdminDisputesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("open");
  const [disputeCursor, setDisputeCursor] = useState<number | undefined>(
    undefined,
  );
  const [resolveDialog, setResolveDialog] = useState<{
    disputeId: number;
    outcome: "valid" | "rejected" | null;
  } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [hideReviewOnResolve, setHideReviewOnResolve] = useState(false);

  const disputeStatusFilterValue = useMemo(() => {
    return disputeStatusFilter === "all" ? undefined : disputeStatusFilter;
  }, [disputeStatusFilter]);

  const { data: disputesResponse, isLoading: isDisputesLoading } = useQuery({
    queryKey: ["admin-disputes", disputeStatusFilterValue, disputeCursor],
    queryFn: async () => {
      const response = await api.adminGetDisputes({
        status: disputeStatusFilterValue,
        limit: 20,
        cursor: disputeCursor,
      });
      console.log("Admin Disputes API Response:", response);
      response.items.forEach((item) => {
        console.log(`Dispute #${item.id}:`, {
          evidenceUrl: item.evidenceUrl,
          evidenceMime: item.evidenceMime,
          hasEvidence: !!item.evidenceUrl,
        });
      });
      return response;
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: ({
      id,
      outcome,
      resolutionNote,
      hideReview,
    }: {
      id: number;
      outcome: "valid" | "rejected";
      resolutionNote?: string;
      hideReview?: boolean;
    }) =>
      api.adminResolveDispute(id, {
        outcome,
        resolutionNote: resolutionNote || undefined,
        hideReview,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast({
        title: "Dispute resolved",
        description: "Dispute status has been updated.",
      });
      setResolveDialog(null);
      setResolutionNote("");
      setHideReviewOnResolve(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id: number) => api.adminDeleteDisputeEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast({
        title: "Evidence deleted",
        description: "Dispute evidence has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDisputePreviousPage = () => {
    setDisputeCursor(undefined);
  };

  const handleDisputeNextPage = () => {
    if (disputesResponse?.nextCursor) {
      setDisputeCursor(disputesResponse.nextCursor);
    }
  };

  const disputes = disputesResponse?.items || [];
  const hasNextDisputePage = disputesResponse?.nextCursor !== null;

  return (
    <AdminLayout currentTab="disputes">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Review Disputes</CardTitle>
          <CardDescription>Manage seller disputes on reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Select
              value={disputeStatusFilter}
              onValueChange={setDisputeStatusFilter}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {disputeStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disputes list */}
          {isDisputesLoading ? (
            <p className="text-sm text-muted-foreground">Loading disputes...</p>
          ) : disputes.length ? (
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
                            Seller:{" "}
                            {dispute.seller?.displayName ||
                              dispute.seller?.username ||
                              `#${dispute.sellerId}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {dispute.reason}
                          </p>
                          {dispute.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Message: {dispute.message}
                            </p>
                          )}
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <p className="font-semibold">
                              Review (⭐{dispute.review?.rating || "-"}):
                            </p>
                            <p className="text-muted-foreground line-clamp-1">
                              &quot;{dispute.review?.comment}&quot;
                            </p>
                          </div>
                          {dispute.resolutionNote && (
                            <p className="text-xs mt-2">
                              Resolution: {dispute.resolutionNote}
                            </p>
                          )}

                          {/* Evidence Section - Always visible */}
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

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {dispute.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setResolveDialog({
                                disputeId: dispute.id,
                                outcome: "valid",
                              })
                            }
                            disabled={resolveDisputeMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Valid Dispute
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setResolveDialog({
                                disputeId: dispute.id,
                                outcome: "rejected",
                              })
                            }
                            disabled={resolveDisputeMutation.isPending}
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
                          onClick={() =>
                            deleteEvidenceMutation.mutate(dispute.id)
                          }
                          disabled={deleteEvidenceMutation.isPending}
                        >
                          {deleteEvidenceMutation.isPending ? (
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

              {/* Pagination */}
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleDisputePreviousPage}
                  disabled={!disputeCursor}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisputeNextPage}
                  disabled={!hasNextDisputePage}
                >
                  Load More
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No disputes found.</p>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dispute Dialog */}
      <AlertDialog
        open={!!resolveDialog}
        onOpenChange={() => setResolveDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolveDialog?.outcome === "valid"
                ? "Mark as Valid Dispute"
                : "Reject Dispute"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolveDialog?.outcome === "valid"
                ? "This will mark the dispute as valid and optionally hide the review."
                : "This will reject the dispute."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Resolution Note (optional)
              </label>
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
                resolveDisputeMutation.mutate({
                  id: resolveDialog.disputeId,
                  outcome: resolveDialog.outcome || "rejected",
                  resolutionNote: resolutionNote || undefined,
                  hideReview:
                    resolveDialog.outcome === "valid"
                      ? hideReviewOnResolve
                      : undefined,
                });
              }
            }}
            disabled={resolveDisputeMutation.isPending}
          >
            {resolveDialog?.outcome === "valid"
              ? "Mark Valid"
              : "Reject Dispute"}
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
