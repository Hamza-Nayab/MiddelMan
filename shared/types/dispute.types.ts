export type DisputeStatus = "open" | "resolved_valid" | "resolved_rejected";

export type ReviewDispute = {
  id: number;
  reviewId: number;
  sellerId: number;
  status: DisputeStatus;
  reason: string;
  message?: string | null;
  evidenceUrl?: string | null;
  evidenceMime?: string | null;
  createdAt: string;
};
