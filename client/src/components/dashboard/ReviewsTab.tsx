import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, AlertTriangle, Upload } from "lucide-react";

const disputeReasons = [
  { value: "inappropriate-review", label: "Inappropriate Review" },
  { value: "fake-review", label: "Fake Review" },
  { value: "incorrect-information", label: "Incorrect Information" },
  { value: "response-already-given", label: "Response Already Given" },
  { value: "other", label: "Other" },
];

type ReviewsTabProps = {
  isReviewsLoading: boolean;
  reviews: any[];
  disputeDialogOpen: number | null;
  setDisputeDialogOpen: (id: number | null) => void;
  disputeForm: any;
  createDisputeMutation: any;
  evidenceFile: File | null;
  setEvidenceFile: (file: File | null) => void;
  uploadEvidenceMutation: any;
  toast: (value: any) => void;
  hasMoreReviews: boolean | undefined;
  fetchMoreReviews: () => void;
  isFetchingMoreReviews: boolean;
};

export const ReviewsTab = memo(function ReviewsTab({
  isReviewsLoading,
  reviews,
  disputeDialogOpen,
  setDisputeDialogOpen,
  disputeForm,
  createDisputeMutation,
  evidenceFile,
  setEvidenceFile,
  uploadEvidenceMutation,
  toast,
  hasMoreReviews,
  fetchMoreReviews,
  isFetchingMoreReviews,
}: ReviewsTabProps) {
  return (
    <>
      <div className="grid gap-4">
        {isReviewsLoading ? (
          <p className="text-center text-muted-foreground py-6">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.reviewId}>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold">
                    {review.reviewerName?.trim() || "Anonymous Buyer"}
                  </div>
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-sm mb-3">{review.comment}</p>
                {review.disputeStatus && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Dispute: {review.disputeStatus}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Dialog
                    open={disputeDialogOpen === review.reviewId}
                    onOpenChange={(open) => {
                      if (!open) {
                        setDisputeDialogOpen(null);
                        disputeForm.reset();
                        setEvidenceFile(null);
                      } else {
                        setDisputeDialogOpen(review.reviewId);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={review.disputeStatus === "open"}
                      >
                        <AlertTriangle className="w-3 h-3 mr-2" />
                        {review.disputeStatus === "open" ? "Dispute Open" : "Dispute"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Dispute Review</DialogTitle>
                      </DialogHeader>
                      <Form {...disputeForm}>
                        <form
                          onSubmit={disputeForm.handleSubmit((values: any) => {
                            createDisputeMutation.mutate({
                              reviewId: review.reviewId,
                              data: values,
                            });
                          })}
                          className="space-y-4"
                        >
                          <FormField
                            control={disputeForm.control}
                            name="reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reason for Dispute</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {disputeReasons.map((reason) => (
                                        <SelectItem key={reason.value} value={reason.value}>
                                          {reason.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={disputeForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Provide more details about your dispute..."
                                    {...field}
                                    className="resize-none"
                                    maxLength={1000}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Evidence (Optional)
                            </label>
                            <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4">
                              {evidenceFile ? (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground">{evidenceFile.name}</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEvidenceFile(null)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 5 * 1024 * 1024) {
                                          toast({
                                            title: "File too large",
                                            description: "File must be less than 5MB",
                                            variant: "destructive",
                                          });
                                        } else {
                                          setEvidenceFile(file);
                                        }
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <Upload className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      Click to upload (PDF, PNG, JPEG, WebP)
                                    </p>
                                    <p className="text-xs text-muted-foreground">Max 5MB</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setDisputeDialogOpen(null);
                                disputeForm.reset();
                                setEvidenceFile(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={
                                createDisputeMutation.isPending || uploadEvidenceMutation.isPending
                              }
                            >
                              {createDisputeMutation.isPending ||
                              uploadEvidenceMutation.isPending ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-background border-t-foreground rounded-full animate-spin mr-2" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Dispute"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {reviews.length > 0 && hasMoreReviews && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchMoreReviews()}
            disabled={isFetchingMoreReviews}
          >
            {isFetchingMoreReviews ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </>
  );
});
