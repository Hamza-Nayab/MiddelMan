import { useParams, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
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
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import generatedImage from "@assets/generated_images/abstract_soft_gradient_mesh_background.png";
import logoImg from "@/assets/middelman-bg.png";
import {
  getAvatarUrl,
  platformIconMap,
  type PlatformKey,
} from "@/lib/graphics";
import { buildWhatsAppUrl, normalizeToE164 } from "@/lib/phone";
import { useMeQuery } from "@/hooks/use-me";
import { useGivenReviewsQuery, useProfileBundleQuery } from "@/hooks/use-profile";

const ReviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, "Comment is required").max(500),
});

const USERNAME_REGEX = /^[a-z0-9._-]{5,20}$/;
const UsernameChangeSchema = z.object({
  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      USERNAME_REGEX,
      "Use lowercase letters, numbers, dots, underscores, or hyphens",
    ),
});

const SAMPLE_RATE = 1 / 3;

const getDayKey = () => new Date().toISOString().slice(0, 10);

const shouldSampleSessionEvent = (key: string, rate = SAMPLE_RATE) => {
  if (typeof window === "undefined") return false;
  const existing = window.sessionStorage.getItem(key);
  if (existing !== null) return existing === "1";
  const hit = Math.random() < rate;
  window.sessionStorage.setItem(key, hit ? "1" : "0");
  return hit;
};

export default function ProfilePage() {
  const { username } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);

  // Compute sampling decision (before we know if owner)
  const shouldSampleTrack = useMemo(() => {
    if (!username) return false;
    const key = `tt-view-${username}-${getDayKey()}`;
    return shouldSampleSessionEvent(key);
  }, [username]);

  const {
    data,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileBundleQuery(username);

  // Track profile view if not owner and should sample
  const trackingMutation = useMutation({
    mutationFn: () => api.trackProfileClick(data!.user.id),
    onError: () => {
      // Silently fail - don't break UX for tracking errors
    },
  });

  useEffect(() => {
    if (!data) return;
    // Only track if: (1) not the owner AND (2) sampling says we should track
    if (data.isOwner) return;
    if (!shouldSampleTrack) return;
    trackingMutation.mutate();
  }, [data, shouldSampleTrack]);

  const { data: me } = useMeQuery();

  // Fetch reviews given by current user to check if already reviewed
  const { data: givenReviews } = useGivenReviewsQuery(
    Boolean(me?.user && !data?.isOwner),
  );

  const user = data?.user;
  const isOwner = data?.isOwner;
  const profile = data?.profile;
  const links = data?.links || [];
  const reviewStats = data?.stats || { avgRating: 0, totalReviews: 0 };

  const getPlatformIcon = (icon?: string | null) => {
    const IconComponent =
      platformIconMap[(icon as PlatformKey) || "website"] ||
      platformIconMap.website;
    return IconComponent;
  };

  const addReviewMutation = useMutation({
    mutationFn: (values: z.infer<typeof ReviewFormSchema>) =>
      api.createReview(user!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", user!.id] });
      setIsReviewOpen(false);
      toast({
        title: "Review Submitted",
        description: "Thanks for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof ReviewFormSchema>>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: { rating: 5, comment: "" },
  });

  const usernameForm = useForm<z.infer<typeof UsernameChangeSchema>>({
    resolver: zodResolver(UsernameChangeSchema),
    defaultValues: { username: "" },
  });

  const usernameInput = usernameForm.watch("username");
  const usernameToCheck =
    usernameInput && usernameInput !== (data?.user?.username ?? "")
      ? usernameInput
      : "";
  const usernameAvailability = useUsernameAvailability(usernameToCheck);

  useEffect(() => {
    if (!user?.username) return;
    usernameForm.setValue("username", user.username);
  }, [user?.username, usernameForm]);

  // SEO: Set meta tags for public profile
  useEffect(() => {
    if (!user || !profile) return;

    const displayName = profile.displayName || user.username || "Seller";
    const title = `${displayName} | MiddelMen Trust Profile`;
    const description = `View ${displayName}'s verified reviews, seller reputation, and trusted profile on MiddelMen.`;
    const profileUrl = `${typeof window !== "undefined" ? window.location.origin : "https://middelmen.com"}/profile/${encodeURIComponent(user.username || "")}`;
    const imageUrl = profile.avatarUrl
      ? profile.avatarUrl
      : `${typeof window !== "undefined" ? window.location.origin : "https://middelmen.com"}/default-avatar.png`;

    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      let tag = document.querySelector(
        `meta[${isProperty ? "property" : "name"}="${name}"]`,
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        if (isProperty) {
          tag.setAttribute("property", name);
        } else {
          tag.setAttribute("name", name);
        }
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    // Meta description
    updateMeta("description", description);

    // OpenGraph tags
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", "profile", true);
    updateMeta("og:url", profileUrl, true);
    updateMeta("og:image", imageUrl, true);

    // Twitter tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", imageUrl);

    // Update or create canonical link
    let canonical = document.querySelector(
      "link[rel=canonical]",
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = profileUrl;

    // JSON-LD structured data
    const jsonLdScript = document.querySelector(
      'script[type="application/ld+json"][data-seo="profile"]',
    );
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: displayName,
      alternateName: user.username,
      url: profileUrl,
      image: imageUrl,
      description: profile.bio || description,
      ...(profile.contactEmail && { email: profile.contactEmail }),
      ...(reviewStats?.totalReviews && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: reviewStats.avgRating.toFixed(1),
          reviewCount: reviewStats.totalReviews,
        },
      }),
    };

    if (jsonLdScript) {
      jsonLdScript.textContent = JSON.stringify(structuredData);
    } else {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo", "profile");
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [user, profile, reviewStats]);

  const changeUsernameMutation = useMutation({
    mutationFn: (values: z.infer<typeof UsernameChangeSchema>) =>
      api.changeUsername(values.username),
    onSuccess: (result) => {
      const newUsername = result.user.username;
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["profile-bundle", username] });
      setIsUsernameDialogOpen(false);
      toast({ title: "Username updated" });
      if (newUsername) {
        window.location.href = `/${newUsername}`;
      }
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : "Failed to update username";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  if (profileLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-medium">
          Loading Profile...
        </div>
      </div>
    );

  const isSellerUnavailable =
    profileError instanceof ApiError &&
    profileError.code === "SELLER_UNAVAILABLE";

  if (isSellerUnavailable)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            Seller unavailable
          </p>
          <p className="text-sm text-muted-foreground">
            This seller is currently unavailable.
          </p>
        </div>
      </div>
    );

  if (profileError || !user || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            Profile not found
          </p>
          {profileError && (
            <p className="text-sm text-muted-foreground">
              {profileError instanceof Error
                ? profileError.message
                : "User not found"}
            </p>
          )}
        </div>
      </div>
    );

  const averageRating = reviewStats?.totalReviews
    ? (reviewStats.avgRating || 0).toFixed(1)
    : "New";

  const usernameChangeCount = me?.user?.usernameChangeCount ?? 0;
  const remainingUsernameChanges = Math.max(0, 3 - usernameChangeCount);
  const lastUsernameChangeAt = me?.user?.lastUsernameChangedAt
    ? new Date(me.user.lastUsernameChangedAt)
    : null;
  const nextUsernameChangeAt = lastUsernameChangeAt
    ? new Date(lastUsernameChangeAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const usernameCooldownActive = nextUsernameChangeAt
    ? new Date() < nextUsernameChangeAt
    : false;
  const daysUntilUsernameChange = usernameCooldownActive
    ? Math.ceil(
        (nextUsernameChangeAt!.getTime() - new Date().getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : 0;
  const canChangeUsername =
    !!isOwner &&
    me?.user?.role === "seller" &&
    remainingUsernameChanges > 0 &&
    !usernameCooldownActive;

  const phoneE164 = normalizeToE164(
    profile.phoneNumber ?? "",
    profile.countryCode ?? undefined,
  );
  const whatsappE164 = normalizeToE164(
    profile.whatsappNumber ?? "",
    profile.countryCode ?? undefined,
  );
  const whatsappUrl = whatsappE164 ? buildWhatsAppUrl(whatsappE164) : null;

  const handleCopyPhone = async () => {
    if (!phoneE164) return;
    try {
      await navigator.clipboard.writeText(phoneE164);
      toast({ title: "Copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmail = async () => {
    if (!profile.contactEmail) return;
    try {
      await navigator.clipboard.writeText(profile.contactEmail);
      toast({ title: "Copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
  };

  // Theme Config
  const themeStyles = {
    light: {
      bg: "bg-slate-50",
      text: "text-slate-900",
      card: "bg-white border-slate-200 shadow-sm",
      cardText: "text-slate-800",
      button: "bg-white/80 hover:bg-white text-slate-900",
      overlay: null,
    },
    dark: {
      bg: "bg-slate-950",
      text: "text-white",
      card: "bg-slate-900 border-slate-800 shadow-sm",
      cardText: "text-slate-100",
      button: "bg-slate-800 hover:bg-slate-700 text-white",
      overlay: null,
    },
    gradient: {
      bg: "bg-background", // Fallback, uses image
      text: "text-slate-900",
      card: "bg-white/80 backdrop-blur-sm border-white/40 shadow-sm",
      cardText: "text-slate-900",
      button: "bg-white/50 backdrop-blur-sm hover:bg-white/70",
      overlay: (
        <div className="fixed inset-0 z-0">
          <img
            src={generatedImage}
            alt="Background"
            className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]" />
        </div>
      ),
    },
  };

  const currentTheme = themeStyles[profile.theme] || themeStyles.light;
  const iconWrapperClass =
    profile.theme === "dark"
      ? "bg-slate-800 border border-slate-700 text-slate-100"
      : "bg-white/80 text-slate-900";

  return (
    <div
      className={cn(
        "min-h-screen relative overflow-x-hidden font-sans",
        currentTheme.bg,
        currentTheme.text,
      )}
    >
      {/* Background */}
      {currentTheme.overlay}

      <div className="relative z-10 container max-w-lg mx-auto px-4 py-12 pb-24 flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img src={logoImg} alt="" className="h-12 w-auto rounded-lg" />
          <span className="font-semibold">MiddelMen</span>
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-10 w-full"
        >
          <Avatar className="w-24 h-24 border-4 border-white/50 shadow-xl mb-4">
            <AvatarImage src={getAvatarUrl(profile.avatarUrl, user?.id)} />
            <AvatarFallback>
              {user.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-2xl font-bold font-heading mb-1 flex items-center gap-2">
            {profile.displayName}
            {profile.isVerified ? (
              <ShieldCheck
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                stroke="white"
              />
            ) : null}
          </h1>
          <p className={cn("mb-4 opacity-80")}>{profile.bio}</p>

          {user.username && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <span>@{user.username}</span>
              {isOwner && me?.user?.role === "seller" && (
                <Dialog
                  open={isUsernameDialogOpen}
                  onOpenChange={setIsUsernameDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change username
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change username</DialogTitle>
                    </DialogHeader>
                    <Form {...usernameForm}>
                      <form
                        onSubmit={usernameForm.handleSubmit((values) =>
                          changeUsernameMutation.mutate(values),
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={usernameForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="5-20 chars, lowercase only"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.value.toLowerCase())
                                  }
                                />
                              </FormControl>
                              {usernameInput &&
                                usernameInput === (user.username ?? "") && (
                                  <p className="text-xs text-muted-foreground">
                                    This is already your current username.
                                  </p>
                                )}
                              {usernameAvailability.status === "checking" && (
                                <p className="text-xs text-muted-foreground">
                                  Checking availability...
                                </p>
                              )}
                              {usernameAvailability.status === "available" && (
                                <p className="text-xs text-emerald-600">
                                  Username is available.
                                </p>
                              )}
                              {usernameAvailability.status === "taken" && (
                                <div className="space-y-2">
                                  <p className="text-xs text-amber-600">
                                    Username is taken.
                                  </p>
                                  {usernameAvailability.suggestions.length >
                                    0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {usernameAvailability.suggestions.map(
                                        (suggestion) => (
                                          <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() =>
                                              usernameForm.setValue(
                                                "username",
                                                suggestion,
                                              )
                                            }
                                            className="text-xs px-2 py-1 bg-muted rounded"
                                          >
                                            {suggestion}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {usernameAvailability.status === "invalid" && (
                                <p className="text-xs text-destructive">
                                  5-20 chars, lowercase only (a-z, 0-9, ._-)
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Remaining changes: {remainingUsernameChanges}</p>
                          {usernameCooldownActive && nextUsernameChangeAt && (
                            <p>
                              Next change in {daysUntilUsernameChange} day(s)
                              (available {nextUsernameChangeAt.toDateString()})
                            </p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={
                            !canChangeUsername ||
                            !usernameAvailability.available ||
                            changeUsernameMutation.isPending
                          }
                          className="w-full"
                        >
                          {changeUsernameMutation.isPending
                            ? "Updating..."
                            : "Update username"}
                        </Button>

                        <p className="text-xs text-muted-foreground">
                          Max 3 lifetime changes. 30-day cooldown between
                          changes. Support@MiddelMen.com for further questions.
                        </p>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm text-sm font-medium",
              currentTheme.card,
            )}
          >
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>{averageRating}</span>
            <span className="opacity-70">
              ({reviewStats?.totalReviews || 0} reviews)
            </span>
          </div>

          <TooltipProvider>
            <div className="mt-3 flex items-center gap-2">
              {phoneE164 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show phone number"
                      className={cn(
                        "h-9 w-9 rounded-full border flex items-center justify-center transition",
                        currentTheme.card,
                      )}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="text-lg font-semibold tracking-wide">
                      {phoneE164}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Copy</span>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="h-7 w-7 rounded-md border flex items-center justify-center hover:bg-muted"
                        aria-label="Copy phone number"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 9H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 4h8v8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 12L20 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open WhatsApp"
                  className={cn(
                    "h-9 w-9 rounded-full border flex items-center justify-center transition",
                    currentTheme.card,
                  )}
                >
                  <SiWhatsapp className="w-4 h-4" />
                </a>
              )}

              {profile.contactEmail && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show email"
                      className={cn(
                        "h-9 w-9 rounded-full border flex items-center justify-center transition",
                        currentTheme.card,
                      )}
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="text-lg font-semibold tracking-wide break-all">
                      {profile.contactEmail}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Copy</span>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="h-7 w-7 rounded-md border flex items-center justify-center hover:bg-muted"
                        aria-label="Copy email"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 9H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 4h8v8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 12L20 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </TooltipProvider>
        </motion.div>

        {/* Links */}
        <div className="w-full space-y-4 mb-12">
          {links
            ?.filter((l) => l.isActive)
            .map((link, i) => (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!user?.id) return;
                  const key = `tt-click-${user.id}-${getDayKey()}`;
                  if (shouldSampleSessionEvent(key)) {
                    void api.trackProfileClick(user.id).catch(() => {});
                  }
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="block"
              >
                <div
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                    currentTheme.card,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center",
                        iconWrapperClass,
                      )}
                    >
                      {(() => {
                        const Icon = getPlatformIcon(link.icon);
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>
                    <span
                      className={cn("font-semibold", currentTheme.cardText)}
                    >
                      {link.title}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              </motion.a>
            ))}
        </div>

        {/* Review Section */}
        <div className="w-full">
          <div className="mb-6 flex items-center justify-between gap-4 flex-col md:flex-row">
            {me?.user && me.user.role === "buyer" ? (
              givenReviews?.reviews.some(
                (review) => review.sellerId === user?.id,
              ) ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className={cn(
                    "rounded-full border-0 opacity-50 cursor-not-allowed",
                    currentTheme.button,
                  )}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Already Reviewed
                </Button>
              ) : (
                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "rounded-full border-0",
                        currentTheme.button,
                      )}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Write Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Leave a Review</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit((values) =>
                          addReviewMutation.mutate(values),
                        )}
                        className="space-y-4"
                      >
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
                                      className={cn(
                                        "text-2xl transition-colors",
                                        star <= field.value
                                          ? "text-yellow-400"
                                          : "text-gray-200",
                                      )}
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
                          disabled={addReviewMutation.isPending}
                        >
                          {addReviewMutation.isPending
                            ? "Submitting..."
                            : "Submit Review"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className={cn(
                  "rounded-full border-0 opacity-50 cursor-not-allowed",
                  currentTheme.button,
                )}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Sign in as a user to
                give review
              </Button>
            )}
          </div>

          {user && <ReviewsSection userId={user.id} />}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-xs font-medium opacity-50 hover:opacity-100 transition-opacity"
          >
            Powered by MiddelMen
          </Link>
        </div>
      </div>
    </div>
  );
}
