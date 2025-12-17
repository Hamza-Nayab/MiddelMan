import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mock-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, MessageCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import generatedImage from '@assets/generated_images/abstract_soft_gradient_mesh_background.png'

const ReviewFormSchema = z.object({
  authorName: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, "Comment is too short"),
});

export default function ProfilePage() {
  const { username } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => username ? api.getProfile(username) : Promise.reject("No username"),
    retry: false,
  });

  const { data: links } = useQuery({
    queryKey: ["links", user?.id],
    queryFn: () => user ? api.getLinks(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", user?.id],
    queryFn: () => user ? api.getReviews(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const addReviewMutation = useMutation({
    mutationFn: (values: z.infer<typeof ReviewFormSchema>) => api.addReview({
      ...values,
      userId: user!.id,
      authorName: values.authorName || "Anonymous",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setIsReviewOpen(false);
      toast({ title: "Review Submitted", description: "Thanks for your feedback!" });
    },
  });

  const form = useForm<z.infer<typeof ReviewFormSchema>>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: { rating: 5, comment: "", authorName: "" },
  });

  if (userLoading) return <div className="h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-primary font-medium">Loading Profile...</div></div>;
  if (!user) return <div className="h-screen flex items-center justify-center bg-background">User not found</div>;

  const averageRating = reviews?.length 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : "New";

  // Theme Config
  const themeStyles = {
    light: {
      bg: "bg-slate-50",
      text: "text-slate-900",
      card: "bg-white border-slate-200 shadow-sm",
      cardText: "text-slate-800",
      button: "bg-white/80 hover:bg-white text-slate-900",
      overlay: null
    },
    dark: {
      bg: "bg-slate-950",
      text: "text-white",
      card: "bg-slate-900 border-slate-800 shadow-sm",
      cardText: "text-slate-100",
      button: "bg-slate-800 hover:bg-slate-700 text-white",
      overlay: null
    },
    gradient: {
      bg: "bg-background", // Fallback, uses image
      text: "text-slate-900",
      card: "bg-white/80 backdrop-blur-sm border-white/40 shadow-sm",
      cardText: "text-slate-900",
      button: "bg-white/50 backdrop-blur-sm hover:bg-white/70",
      overlay: <div className="fixed inset-0 z-0"><img src={generatedImage} alt="Background" className="w-full h-full object-cover opacity-30 blur-3xl scale-110" /><div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]" /></div>
    }
  };

  const currentTheme = themeStyles[user.theme] || themeStyles.light;

  return (
    <div className={cn("min-h-screen relative overflow-x-hidden font-sans", currentTheme.bg, currentTheme.text)}>
      {/* Background */}
      {currentTheme.overlay}

      <div className="relative z-10 container max-w-lg mx-auto px-4 py-12 pb-24 flex flex-col items-center">
        
        {/* Profile Header */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mb-10 w-full"
        >
            <Avatar className="w-24 h-24 border-4 border-white/50 shadow-xl mb-4">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl font-bold font-heading mb-1 flex items-center gap-2">
                {user.displayName} 
                <ShieldCheck className="w-5 h-5 text-blue-500" fill="currentColor" stroke="white" />
            </h1>
            <p className={cn("mb-4 opacity-80")}>{user.bio}</p>

            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm text-sm font-medium", currentTheme.card)}>
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span>{averageRating}</span>
                <span className="opacity-70">({reviews?.length || 0} reviews)</span>
            </div>
        </motion.div>

        {/* Links */}
        <div className="w-full space-y-4 mb-12">
            {links?.filter(l => l.isVisible).map((link, i) => (
                <motion.a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block"
                >
                    <div className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between group", currentTheme.card)}>
                        <span className={cn("font-semibold", currentTheme.cardText)}>{link.title}</span>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                </motion.a>
            ))}
        </div>

        {/* Review Section */}
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-heading">Reviews</h3>
                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("rounded-full border-0", currentTheme.button)}>
                            <MessageCircle className="w-4 h-4 mr-2" /> Write Review
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave a Review</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((v) => addReviewMutation.mutate(v))} className="space-y-4">
                                <FormField
                                    control={form.control}
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
                                                            onClick={() => field.onChange(star)}
                                                            className={cn("text-2xl transition-colors", star <= field.value ? "text-yellow-400" : "text-gray-200")}
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
                                    control={form.control}
                                    name="authorName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name (Optional)</FormLabel>
                                            <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="comment"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Comment</FormLabel>
                                            <FormControl><Textarea placeholder="Share your thoughts..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={addReviewMutation.isPending}>
                                    Submit Review
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {reviews?.slice(0, 5).map((review) => (
                    <div key={review.id} className={cn("p-4 rounded-2xl border", currentTheme.card)}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{review.authorName}</span>
                            <div className="flex text-yellow-500 text-xs">
                                {Array.from({length: review.rating}).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                            </div>
                        </div>
                        <p className={cn("text-sm leading-relaxed opacity-90", currentTheme.cardText)}>{review.comment}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="mt-12 text-center">
            <Link href="/" className="text-xs font-medium opacity-50 hover:opacity-100 transition-opacity">
                    Powered by TrustThread
            </Link>
        </div>

      </div>
    </div>
  );
}
