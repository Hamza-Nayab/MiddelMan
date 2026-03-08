export type AnalyticsDay = {
  day: string;
  views: number;
  clicks: number;
};

export type AnalyticsResponse = {
  days: AnalyticsDay[];
};

export type AnalyticsOverview = {
  days: number;
  totalViews: number;
  totalClicks: number;
  topSellersByViews: Array<{
    userId: number;
    username: string | null;
    displayName: string;
    views: number;
  }>;
  topSellersByClicks: Array<{
    userId: number;
    username: string | null;
    displayName: string;
    clicks: number;
  }>;
};
