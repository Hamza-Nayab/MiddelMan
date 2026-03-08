import { useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisputeFilters } from "@/components/admin/disputes/DisputeFilters";
import { DisputeTable } from "@/components/admin/disputes/DisputeTable";
import { DisputeDetailModal } from "@/components/admin/disputes/DisputeDetailModal";
import { useAdminDisputes } from "@/hooks/admin/useAdminDisputes";

export default function AdminDisputesPage() {
  const {
    disputeStatusFilter,
    sellerSearch,
    disputeCursor,
    disputesResponse,
    isDisputesLoading,
    resolveDialog,
    resolutionNote,
    hideReviewOnResolve,
    setResolveDialog,
    setResolutionNote,
    setHideReviewOnResolve,
    handleStatusFilterChange,
    handleSellerSearchChange,
    handleDisputePreviousPage,
    handleDisputeNextPage,
    resolveDisputeMutation,
    deleteEvidenceMutation,
  } = useAdminDisputes();

  const disputes = useMemo(() => disputesResponse?.items ?? [], [disputesResponse?.items]);
  const hasNextDisputePage = disputesResponse?.nextCursor !== null;

  const handleResolveValid = useCallback(
    (disputeId: number) => {
      setResolveDialog({ disputeId, outcome: "valid" });
    },
    [setResolveDialog],
  );

  const handleResolveRejected = useCallback(
    (disputeId: number) => {
      setResolveDialog({ disputeId, outcome: "rejected" });
    },
    [setResolveDialog],
  );

  const handleDeleteEvidence = useCallback(
    (disputeId: number) => {
      deleteEvidenceMutation.mutate(disputeId);
    },
    [deleteEvidenceMutation.mutate],
  );

  const handleResolve = useCallback(
    (payload: {
      id: number;
      outcome: "valid" | "rejected";
      resolutionNote?: string;
      hideReview?: boolean;
    }) => {
      resolveDisputeMutation.mutate(payload);
    },
    [resolveDisputeMutation.mutate],
  );

  return (
    <AdminLayout currentTab="disputes">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Review Disputes</CardTitle>
          <CardDescription>Manage seller disputes on reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisputeFilters
            disputeStatusFilter={disputeStatusFilter}
            sellerSearch={sellerSearch}
            onStatusChange={handleStatusFilterChange}
            onSellerSearchChange={handleSellerSearchChange}
          />

          <DisputeTable
            disputes={disputes}
            isDisputesLoading={isDisputesLoading}
            disputeCursor={disputeCursor}
            hasNextDisputePage={hasNextDisputePage}
            onPreviousPage={handleDisputePreviousPage}
            onNextPage={handleDisputeNextPage}
            onResolveValid={handleResolveValid}
            onResolveRejected={handleResolveRejected}
            onDeleteEvidence={handleDeleteEvidence}
            isResolvePending={resolveDisputeMutation.isPending}
            isDeleteEvidencePending={deleteEvidenceMutation.isPending}
          />
        </CardContent>
      </Card>

      <DisputeDetailModal
        resolveDialog={resolveDialog}
        setResolveDialog={setResolveDialog}
        resolutionNote={resolutionNote}
        setResolutionNote={setResolutionNote}
        hideReviewOnResolve={hideReviewOnResolve}
        setHideReviewOnResolve={setHideReviewOnResolve}
        onResolve={handleResolve}
        isResolvePending={resolveDisputeMutation.isPending}
      />
    </AdminLayout>
  );
}
