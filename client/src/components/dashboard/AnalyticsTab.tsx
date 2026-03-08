import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type AnalyticsTabProps = {
  isAnalyticsLoading: boolean;
  reviewStats: { avgRating: number; totalReviews: number };
  analyticsTotals: { visits: number; clicks: number };
  analyticsData: Array<{ name: string; visits: number; clicks: number }>;
  pieData: Array<{ name: string; value: number; color: string }>;
};

export const AnalyticsTab = memo(function AnalyticsTab({
  isAnalyticsLoading,
  reviewStats,
  analyticsTotals,
  analyticsData,
  pieData,
}: AnalyticsTabProps) {
  return (
    <>
      {isAnalyticsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      )}
      {!isAnalyticsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Rating</CardTitle>
                <CardDescription>Based on all reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reviewStats.totalReviews ? reviewStats.avgRating.toFixed(1) : "New"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {reviewStats.totalReviews} total reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Reviews</CardTitle>
                <CardDescription>All-time submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reviewStats.totalReviews}</div>
                <p className="text-sm text-muted-foreground">Keep collecting feedback</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Visits & Clicks</CardTitle>
                <CardDescription>Last 14 days performance</CardDescription>
              </CardHeader>
              <CardContent className="h-75">
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                    <span className="font-medium text-foreground">{analyticsTotals.visits}</span>
                    <span>Visits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                    <span className="font-medium text-foreground">{analyticsTotals.clicks}</span>
                    <span>Clicks</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorVisits)"
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#10b981"
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Distribution</CardTitle>
                <CardDescription>Breakdown of star ratings</CardDescription>
              </CardHeader>
              <CardContent className="h-75 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
});
