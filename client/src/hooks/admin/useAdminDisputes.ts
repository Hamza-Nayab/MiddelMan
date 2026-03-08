import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ADMIN_DISPUTES_QUERY_KEY = ["admin-disputes"] as const;

const adminDisputesQueryKey = (
  status: string | undefined,
  sellerId: number | undefined,
  cursor: number | undefined,
) => [...ADMIN_DISPUTES_QUERY_KEY, status, sellerId, cursor] as const;

export function useAdminDisputes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [disputeStatusFilter, setDisputeStatusFilter] = useState("open");
  const [sellerSearch, setSellerSearch] = useState("");
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

  const sellerIdFilter = useMemo(() => {
    const trimmed = sellerSearch.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [sellerSearch]);

  const { data: disputesResponse, isLoading: isDisputesLoading } = useQuery({
    queryKey: adminDisputesQueryKey(
      disputeStatusFilterValue,
      sellerIdFilter,
      disputeCursor,
    ),
    queryFn: () =>
      api.adminGetDisputes({
        status: disputeStatusFilterValue,
        sellerId: sellerIdFilter,
        limit: 20,
        cursor: disputeCursor,
      }),
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
      queryClient.invalidateQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });
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

  const handleStatusFilterChange = (value: string) => {
    setDisputeStatusFilter(value);
    setDisputeCursor(undefined);
  };

  const handleSellerSearchChange = (value: string) => {
    setSellerSearch(value);
    setDisputeCursor(undefined);
  };

  return {
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
  };
}
