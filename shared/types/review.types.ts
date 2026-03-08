export type Review = {
  id: number;
  sellerId: number;
  reviewerUserId?: number | null;
  authorName: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  createdAt: string;
};

export type ReviewBreakdown = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewStats = {
  avgRating: number;
  totalReviews: number;
  breakdown?: ReviewBreakdown;
};
