import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ExternalLink } from "lucide-react";
import {
  getAvatarUrl,
  platformIconMap,
  type PlatformKey,
} from "@/lib/graphics";

const DEMO_PROFILE = {
  id: 1,
  username: "johndoe",
  displayName: "John Doe",
  bio: "Digital Entrepreneur • Tech Enthusiast • Always Learning",
  avatar: "nova",
  theme: "gradient" as const,
};

const DEMO_LINKS = [
  {
    id: 1,
    title: "My Portfolio",
    url: "https://example.com",
    icon: "website",
    isActive: true,
  },
  {
    id: 2,
    title: "LinkedIn",
    url: "https://linkedin.com/in/johndoe",
    icon: "linkedin",
    isActive: true,
  },
  {
    id: 3,
    title: "X (Twitter)",
    url: "https://twitter.com/johndoe",
    icon: "x",
    isActive: true,
  },
  {
    id: 4,
    title: "GitHub",
    url: "https://github.com/johndoe",
    icon: "github",
    isActive: true,
  },
];

const DEMO_REVIEWS = [
  {
    id: 1,
    authorName: "Sarah",
    rating: 5,
    comment:
      "Fantastic work! John delivers excellence on every project. Highly recommended!",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    authorName: "Michael",
    rating: 5,
    comment:
      "Professional, reliable, and great communication. A pleasure to work with.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 3,
    authorName: "Emma",
    rating: 4,
    comment:
      "Great quality work and fast turnaround. Will definitely hire again.",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export default function DemoProfile() {
  const getPlatformIcon = (icon?: string | null) => {
    const IconComponent =
      platformIconMap[(icon as PlatformKey) || "website"] ||
      platformIconMap.website;
    return IconComponent;
  };
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    rating: 5,
    comment: "",
  });

  const avatarUrl = getAvatarUrl(DEMO_PROFILE.avatar);
  const avgRating =
    DEMO_REVIEWS.length > 0
      ? (
          DEMO_REVIEWS.reduce((sum, r) => sum + r.rating, 0) /
          DEMO_REVIEWS.length
        ).toFixed(1)
      : "0";

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    // In demo, just close the dialog
    setIsReviewDialogOpen(false);
    setReviewForm({ name: "", rating: 5, comment: "" });
  };

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Profile Header */}
          <div className="text-center mb-12">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary/20">
              <AvatarImage src={avatarUrl} alt={DEMO_PROFILE.displayName} />
              <AvatarFallback>{DEMO_PROFILE.displayName[0]}</AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold mb-2">
              {DEMO_PROFILE.displayName}
            </h1>
            <p className="text-muted-foreground text-lg mb-4">
              @{DEMO_PROFILE.username}
            </p>
            <p className="text-foreground/80 max-w-md mx-auto mb-6">
              {DEMO_PROFILE.bio}
            </p>

            {/* Rating Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(parseFloat(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">
                {avgRating} ({DEMO_REVIEWS.length} reviews)
              </span>
            </div>
          </div>

          {/* Links Section */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Connect</h2>
            <div className="grid gap-3">
              {DEMO_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer hover:border-primary/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                          {(() => {
                            const Icon = getPlatformIcon(link.icon);
                            return <Icon className="h-5 w-5" />;
                          })()}
                        </div>
                        <span className="font-medium">{link.title}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Reviews</h2>
              <Button onClick={() => setIsReviewDialogOpen(true)}>
                Leave a Review
              </Button>
            </div>

            <div className="space-y-4">
              {DEMO_REVIEWS.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{review.authorName}</p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-foreground/80">{review.comment}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Demo Badge */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="gap-2">
              ✨ This is a demo profile
            </Badge>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {DEMO_PROFILE.displayName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <input
                id="name"
                type="text"
                placeholder="Anonymous"
                value={reviewForm.name}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>

            <div>
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setReviewForm({ ...reviewForm, rating: star })
                    }
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${reviewForm.rating >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Share your experience..."
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, comment: e.target.value })
                }
                className="min-h-24"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Review</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
