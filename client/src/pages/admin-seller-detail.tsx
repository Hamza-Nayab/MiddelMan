import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Star, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSellerDetailPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { id: sellerId } = useParams<{ id?: string }>();
  const parsedSellerId = sellerId ? Number(sellerId) : undefined;

  const [disableDialog, setDisableDialog] = useState<boolean>(false);
  const [disableReason, setDisableReason] = useState("");

  const returnUrl =
    typeof window === "undefined"
      ? "/admin/users"
      : sessionStorage.getItem("adminUsersFilterUrl") || "/admin/users";

  const {
    data: detail,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-seller-detail", parsedSellerId],
    queryFn: () => api.adminGetSellerDetail(parsedSellerId!),
    enabled: !!parsedSellerId && !Number.isNaN(parsedSellerId),
  });

  const disableUserMutation = useMutation({
    mutationFn: () => api.adminDisableUser(parsedSellerId!, disableReason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-seller-detail", parsedSellerId],
      });
      setDisableDialog(false);
      setDisableReason("");
      toast({ title: "User disabled" });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to disable user",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: () => api.adminEnableUser(parsedSellerId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-seller-detail", parsedSellerId],
      });
      toast({ title: "User enabled" });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to enable user",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const hideReviewMutation = useMutation({
    mutationFn: ({
      reviewId,
      isHidden,
    }: {
      reviewId: number;
      isHidden: boolean;
    }) => api.adminHideReview(reviewId, isHidden),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-seller-detail", parsedSellerId],
      });
      toast({
        title: variables.isHidden ? "Review hidden" : "Review unhidden",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to update review",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!parsedSellerId || Number.isNaN(parsedSellerId)) {
    return (
      <AdminLayout currentTab="users">
        <div className="p-6 text-center text-muted-foreground">
          Invalid user ID
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout currentTab="users">
        <div className="p-6 text-center text-muted-foreground">
          Loading user details...
        </div>
      </AdminLayout>
    );
  }

  if (error || !detail) {
    return (
      <AdminLayout currentTab="users">
        <div className="p-6 text-center text-destructive">
          User not found or error loading details
        </div>
      </AdminLayout>
    );
  }

  const {
    user,
    profile,
    links,
    stats,
    reviewsReceived,
    reviewsGiven,
    recentDisputes,
  } = detail;

  // Calculate average rating display
  const avgRatingDisplay = stats.avgRating
    ? Number(stats.avgRating).toFixed(1)
    : "N/A";

  // Dynamic title based on role
  const pageTitle = user.role === "buyer" ? "Buyer Details" : "User Details";

  return (
    <AdminLayout currentTab="users">
      <div className="p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(returnUrl)}
          >
            ← Back to Users
          </Button>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-semibold">#{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-semibold">{user.username || "(none)"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-sm truncate">
                  {user.email || "(none)"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex-1">
                <div className="flex gap-2 flex-wrap">
                  {user.isDisabled && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Disabled
                    </Badge>
                  )}
                  {user.isMasterAdmin && (
                    <Badge variant="destructive">Master Admin</Badge>
                  )}
                </div>
                {user.disabledReason && (
                  <p className="text-xs text-destructive mt-2">
                    Reason: {user.disabledReason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {user.isDisabled ? (
                  <Button
                    size="sm"
                    onClick={() => enableUserMutation.mutate()}
                    disabled={enableUserMutation.isPending}
                  >
                    Re-enable
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDisableDialog(true)}
                  >
                    Disable
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage src={profile.avatarUrl || ""} />
                  <AvatarFallback>
                    {(profile.displayName || "S")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{profile.displayName}</p>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                  {profile.contactEmail && (
                    <p className="text-xs text-muted-foreground">
                      Email: {profile.contactEmail}
                    </p>
                  )}
                  {profile.phoneNumber && (
                    <p className="text-xs text-muted-foreground">
                      Phone: {profile.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{avgRatingDisplay}</span>
                  {stats.avgRating > 0 && (
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold mt-1">{stats.totalReviews}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Disputes</p>
                <p className="text-2xl font-bold mt-1">
                  {recentDisputes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        {links && links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 rounded border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reviews</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/admin/reviews?sellerId=${parsedSellerId}`)
              }
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="received" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received">
                  Received ({reviewsReceived?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="given">
                  Given ({reviewsGiven?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="received" className="mt-4">
                {reviewsReceived && reviewsReceived.length > 0 ? (
                  <div className="space-y-3">
                    {reviewsReceived.map((review) => (
                      <div
                        key={review.id}
                        className="p-3 rounded border border-border/50 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          {review.isHidden && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{review.comment}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            <p className="text-xs text-muted-foreground">
                              by {review.authorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              hideReviewMutation.mutate({
                                reviewId: review.id,
                                isHidden: !review.isHidden,
                              })
                            }
                            disabled={hideReviewMutation.isPending}
                          >
                            {review.isHidden ? "Unhide" : "Hide"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reviews received
                  </p>
                )}
              </TabsContent>

              <TabsContent value="given" className="mt-4">
                {reviewsGiven && reviewsGiven.length > 0 ? (
                  <div className="space-y-3">
                    {reviewsGiven.map((review) => (
                      <div
                        key={review.id}
                        className="p-3 rounded border border-border/50 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          {review.isHidden && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{review.comment}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            <p className="text-xs text-muted-foreground">
                              for seller #{review.sellerId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              hideReviewMutation.mutate({
                                reviewId: review.id,
                                isHidden: !review.isHidden,
                              })
                            }
                            disabled={hideReviewMutation.isPending}
                          >
                            {review.isHidden ? "Unhide" : "Hide"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reviews given
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Disputes */}
        {recentDisputes && recentDisputes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Disputes</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/admin/disputes?sellerId=${parsedSellerId}`)
                }
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="p-3 rounded border border-border/50 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">#{dispute.id}</p>
                      <Badge
                        variant={
                          dispute.status === "open"
                            ? "outline"
                            : dispute.status === "resolved_valid"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{dispute.reason}</p>
                    {dispute.message && (
                      <p className="text-xs text-muted-foreground">
                        {dispute.message}
                      </p>
                    )}
                    {dispute.resolutionNote && (
                      <p className="text-xs border-l-2 border-muted-foreground pl-2 text-muted-foreground">
                        Resolution: {dispute.resolutionNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Disable Dialog */}
      <AlertDialog open={disableDialog} onOpenChange={setDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable User</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for disabling this user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for disabling..."
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            className="max-h-24"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground">
            {disableReason.length}/500
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableUserMutation.mutate()}
              disabled={disableUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableUserMutation.isPending ? "Disabling..." : "Disable"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
