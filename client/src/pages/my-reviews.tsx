import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { api, ApiError } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMeQuery } from "@/hooks/use-me";
import { useGivenReviewsQuery } from "@/hooks/use-profile";

const ReviewEditSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, "Comment is required").max(500),
});

export default function MyReviewsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    data: me,
    isLoading: isUserLoading,
    error: meError,
  } = useMeQuery();

  // Handle account disabled error
  useEffect(() => {
    if (meError instanceof ApiError && meError.code === "ACCOUNT_DISABLED") {
      setLocation("/disabled");
    }
  }, [meError, setLocation]);

  useEffect(() => {
    if (!isUserLoading && !me?.user) {
      setLocation("/auth");
    }
  }, [isUserLoading, me, setLocation]);

  useEffect(() => {
    if (!isUserLoading && me?.user) {
      if (me.user.role === "seller") {
        setLocation("/dashboard");
      }
      if (me.user.role === "admin") {
        setLocation("/admin");
      }
    }
  }, [isUserLoading, me, setLocation]);

  const { data: reviewsResponse, isLoading } = useGivenReviewsQuery(
    !!me?.user && me.user.role === "buyer",
  );

  const editForm = useForm<z.infer<typeof ReviewEditSchema>>({
    resolver: zodResolver(ReviewEditSchema),
    defaultValues: { rating: 5, comment: "" },
  });

  const editMutation = useMutation({
    mutationFn: (values: z.infer<typeof ReviewEditSchema>) => {
      if (editingId === null) {
        return Promise.reject(new Error("No review selected."));
      }
      return api.updateGivenReview(editingId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["given-reviews"] });
      setEditingId(null);
      toast({ title: "Review updated" });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (
      me?.user?.role !== "buyer" &&
      me?.user?.role !== "seller" &&
      me?.user?.role !== "admin"
    ) {
      toast({
        title: "Access limited",
        description: "Please log in to view your reviews.",
      });
    }
  }, [me, toast]);

  const reviews = reviewsResponse?.reviews ?? [];
  const filteredReviews = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const sorted = [...reviews].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!normalized) return sorted;
    return sorted.filter((review) => {
      const sellerName =
        review.seller.displayName || review.seller.username || "";
      return sellerName.toLowerCase().includes(normalized);
    });
  }, [reviews, search]);

  if (isUserLoading || !me?.user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>My Reviews</CardTitle>
            <CardDescription>All reviews you have submitted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by seller name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading reviews...
              </p>
            ) : filteredReviews.length ? (
              filteredReviews.map((review) => (
                <Card key={review.id} className="border-border/60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        {review.seller.displayName ||
                          review.seller.username ||
                          "Seller"}
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${review.seller.username ?? ""}`}
                          className="text-xs text-primary flex items-center gap-1"
                        >
                          View profile <ExternalLink className="w-3 h-3" />
                        </Link>
                        <Dialog
                          open={editingId === review.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingId(review.id);
                              editForm.reset({
                                rating: review.rating,
                                comment: review.comment,
                              });
                            } else {
                              setEditingId(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Review</DialogTitle>
                            </DialogHeader>
                            <Form {...editForm}>
                              <form
                                onSubmit={editForm.handleSubmit((values) =>
                                  editMutation.mutate(values),
                                )}
                                className="space-y-4"
                              >
                                <FormField
                                  control={editForm.control}
                                  name="rating"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Rating</FormLabel>
                                      <FormControl>
                                        <div className="flex gap-2">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() =>
                                                field.onChange(star)
                                              }
                                              className={`text-2xl transition-colors ${
                                                star <= field.value
                                                  ? "text-yellow-400"
                                                  : "text-gray-200"
                                              }`}
                                            >
                                              ★
                                            </button>
                                          ))}
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="comment"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Comment</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Share your thoughts..."
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="submit"
                                  className="w-full"
                                  disabled={editMutation.isPending}
                                >
                                  {editMutation.isPending
                                    ? "Saving..."
                                    : "Save Changes"}
                                </Button>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() =>
                                      editForm.reset({
                                        rating: review.rating,
                                        comment: review.comment,
                                      })
                                    }
                                  >
                                    Reset
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Rating: {review.rating} ★
                    </p>
                    <p className="text-sm">{review.comment}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
