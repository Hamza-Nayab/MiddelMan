import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<7 | 30>(7);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: () => api.adminGetAnalyticsOverview(days),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <AdminLayout currentTab="analytics">
        <div className="p-6 text-center text-muted-foreground">
          Loading analytics...
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout currentTab="analytics">
        <div className="p-6 text-center text-destructive">
          Error loading analytics
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentTab="analytics">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <div className="flex gap-2">
            <Button
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(7)}
            >
              Last 7 Days
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(30)}
            >
              Last 30 Days
            </Button>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.totalViews.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.totalClicks.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last {days} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Sellers by Views */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sellers by Views</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSellersByViews.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rank</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topSellersByViews.map((seller, idx) => (
                    <TableRow key={seller.userId}>
                      <TableCell className="text-xs font-semibold text-muted-foreground">
                        #{idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {seller.displayName}
                          </span>
                          {seller.username && (
                            <span className="text-xs text-muted-foreground">
                              @{seller.username}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {seller.views.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Sellers by Clicks */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sellers by Clicks</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSellersByClicks.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rank</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topSellersByClicks.map((seller, idx) => (
                    <TableRow key={seller.userId}>
                      <TableCell className="text-xs font-semibold text-muted-foreground">
                        #{idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {seller.displayName}
                          </span>
                          {seller.username && (
                            <span className="text-xs text-muted-foreground">
                              @{seller.username}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {seller.clicks.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
