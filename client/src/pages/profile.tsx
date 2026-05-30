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
  Copy,
  Flag,
  Star,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  QrCode,
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
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { Antigravity, Aurora, Iridescence } from "@/components/backgrounds";
import logoImg from "@/assets/middelman-bg.png";
import { SEO } from "@/components/seo";
import {
  getAvatarUrl,
  platformIconMap,
  type PlatformKey,
} from "@/lib/graphics";
import { resolveProfileAppearance } from "@/lib/profile-appearance";
import { buildWhatsAppUrl, normalizeToE164 } from "@/lib/phone";
import { useMeQuery } from "@/hooks/use-me";
import {
  givenReviewsQueryKey,
  useGivenReviewsQuery,
  useProfileBundleQuery,
} from "@/hooks/use-profile";

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
const PUBLIC_REVIEWS_PAGE_SIZE = 5;

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
  const [reportSellerReason, setReportSellerReason] = useState("");
  const [reportSellerMessage, setReportSellerMessage] = useState("");

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
  } = useProfileBundleQuery(username, { limit: PUBLIC_REVIEWS_PAGE_SIZE });

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
      queryClient.invalidateQueries({
        queryKey: ["profile-bundle", username],
      });
      queryClient.invalidateQueries({ queryKey: givenReviewsQueryKey });
      setIsReviewOpen(false);
      form.reset({ rating: 5, comment: "" });
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

  const displayName = profile?.displayName || user?.username || "Seller";
  const seoTitle = user && profile ? `${displayName} | MiddelMen Trust Profile` : "MiddelMen Trust Profile";
  const seoDescription = user && profile ? `View ${displayName}'s verified reviews, seller reputation, and trusted profile on MiddelMen.` : "View verified reviews, seller reputation, and trusted profile on MiddelMen.";
  const seoImage = profile?.avatarUrl || undefined;

  const seoSchema = useMemo(() => {
    if (!user || !profile) return undefined;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://middelmen.com";
    const profileUrl = `${origin}/${encodeURIComponent(user.username || "")}`;
    const imageUrl = profile.avatarUrl || `${origin}/default-avatar.png`;
    const description = `View ${displayName}'s verified reviews, seller reputation, and trusted profile on MiddelMen.`;

    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "mainEntity": {
        "@type": "Person",
        "name": displayName,
        "alternateName": user.username,
        "url": profileUrl,
        "image": imageUrl,
        "description": profile.bio || description,
        ...(profile.contactEmail && { "email": profile.contactEmail }),
        ...(reviewStats?.totalReviews ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": reviewStats.avgRating.toFixed(1),
            "reviewCount": reviewStats.totalReviews,
          }
        } : {})
      }
    };
  }, [user, profile, displayName, reviewStats]);

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

  const reportSellerMutation = useMutation({
    mutationFn: (values: { reason: string; message?: string }) =>
      api.reportSellerByUsername(username!, values),
    onSuccess: () => {
      setReportSellerReason("");
      setReportSellerMessage("");
      toast({
        title: "Report submitted",
        description: "Thanks. Our team will review this seller report.",
      });
    },
    onError: (error) => {
      toast({
        title: "Report failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reportReviewMutation = useMutation({
    mutationFn: ({
      reviewId,
      reason,
      message,
    }: {
      reviewId: number;
      reason: string;
      message?: string;
    }) => api.reportReview(reviewId, { reason, message }),
    onSuccess: () => {
      toast({
        title: "Review reported",
        description: "Thanks. Our team will review this report.",
      });
    },
    onError: (error) => {
      toast({
        title: "Report failed",
        description: error.message,
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
  const profileUrl =
    typeof window !== "undefined" ? window.location.href : `/${username ?? ""}`;
  const instagramBioCopy = `${profile.displayName} | Reviews & trust profile ${profileUrl}`;
  const whatsappShareCopy = `Check ${profile.displayName}'s trust profile on MiddelMen: ${profileUrl}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(profileUrl)}`;

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

  const handleCopyText = async (value: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: label });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const appearance = resolveProfileAppearance({
    theme: profile.theme,
    backgroundPreset: profile.backgroundPreset as
      | "gradient"
      | "antigravity"
      | "aurora"
      | "iridescence"
      | null,
    gradientPreset: profile.gradientPreset as
      | "default"
      | "ocean"
      | "sunset"
      | "forest"
      | "berry"
      | "royal"
      | "ember"
      | "mono"
      | null,
    accentColor: profile.accentColor,
  });
  const bgPreset = appearance.backgroundPreset as
    | "antigravity"
    | "aurora"
    | "iridescence"
    | null;
  const backgroundOverlay =
    appearance.hasAnimatedBackground && bgPreset ? (
      <ProfileAnimatedBackground
        preset={bgPreset}
        overlayClass={appearance.overlayClass}
      />
    ) : appearance.hasGradientBackground && appearance.gradientBackground ? (
      <div
        className="fixed inset-0 z-0"
        style={{ background: appearance.gradientBackground }}
      >
        {appearance.overlayClass && (
          <div className={cn("absolute inset-0", appearance.overlayClass)} />
        )}
      </div>
    ) : null;
  const activeLinks = links?.filter((link) => link.isActive) ?? [];
  const trustBadgeLabel = profile.isVerified
    ? "Verified Seller"
    : profile.verificationStatus === "pending"
      ? "Verification Pending"
      : reviewStats.totalReviews > 0
        ? "Trusted Seller"
        : "New Seller";
  const joinedLabel = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "min-h-screen relative overflow-x-hidden font-sans",
        appearance.pageBgClass,
        appearance.pageTextClass,
      )}
    >
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        type="profile"
        schema={seoSchema}
      />
      {/* Background */}
      {backgroundOverlay}

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-8 md:py-12 pb-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <img
            src={logoImg}
            alt=""
            className="h-9 w-9 rounded-[4px] object-cover"
          />
          <span className="font-semibold">MiddelMen</span>
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-8 rounded-[2rem] border p-5 md:p-7",
            appearance.surfaceClass,
          )}
          style={appearance.accentCardStyle}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.92fr)]">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <Avatar
                  className={cn(
                    "h-24 w-24 shrink-0 border-4 shadow-xl md:h-28 md:w-28",
                    appearance.usesDynamicBackground
                      ? appearance.usesBrightBackground
                        ? "border-slate-300"
                        : "border-white/50"
                      : profile.theme === "dark"
                        ? "border-slate-700"
                        : "border-white/70",
                  )}
                >
                  <AvatarImage
                    src={getAvatarUrl(profile.avatarUrl, user?.id)}
                  />
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                        appearance.surfaceMutedClass,
                      )}
                    >
                      {profile.isVerified ? (
                        <ShieldCheck
                          className="w-3.5 h-3.5 text-blue-500"
                          fill="currentColor"
                          stroke="white"
                        />
                      ) : null}
                      {trustBadgeLabel}
                    </div>
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
                        appearance.surfaceMutedClass,
                      )}
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {averageRating} rating
                    </div>
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                      {profile.displayName}
                    </h1>
                    <div
                      className={cn(
                        "mt-2 flex flex-wrap items-center gap-3 text-sm",
                        appearance.mutedTextClass,
                      )}
                    >
                      <span>@{user.username}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Joined {joinedLabel}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{reviewStats.totalReviews} reviews</span>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "max-w-3xl text-sm leading-7 md:text-base",
                      appearance.mutedTextClass,
                    )}
                  >
                    {profile.bio ||
                      "A public trust profile where buyers can check reviews, seller links, and contact details before placing an order."}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Trust Badge", value: trustBadgeLabel },
                  { label: "Joined", value: joinedLabel },
                  {
                    label: "Total Reviews",
                    value: String(reviewStats.totalReviews),
                  },
                  { label: "Average Rating", value: averageRating },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "rounded-2xl border p-4",
                      appearance.surfaceMutedClass,
                    )}
                  >
                    <p
                      className={cn(
                        "text-[11px] uppercase tracking-[0.18em]",
                        appearance.mutedTextClass,
                      )}
                    >
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-sm font-semibold md:text-base",
                        appearance.primaryTextClass,
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-[1.75rem] border p-5",
                  appearance.surfaceMutedClass,
                )}
                style={appearance.accentCardStyle}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Actions</p>
                    <p
                      className={cn("mt-1 text-sm", appearance.mutedTextClass)}
                    >
                      Share this profile, contact the seller, or raise a
                      concern.
                    </p>
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
                      appearance.surfaceClass,
                    )}
                    style={appearance.accentButtonStyle}
                  >
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {averageRating}
                  </div>
                </div>

                <TooltipProvider>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {phoneE164 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Show phone number"
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-full border transition",
                              appearance.contactButtonClass,
                            )}
                            style={appearance.accentIconStyle}
                          >
                            <Phone
                              className={cn(
                                "w-4 h-4",
                                appearance.iconColorClass,
                              )}
                              style={appearance.accentTextStyle}
                            />
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
                              <Copy className="h-3.5 w-3.5" />
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
                          "flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-full border px-4 transition",
                          appearance.contactButtonClass,
                        )}
                        style={appearance.accentIconStyle}
                      >
                        <SiWhatsapp
                          className={cn("h-4 w-4", appearance.iconColorClass)}
                          style={appearance.accentTextStyle}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            appearance.iconColorClass,
                          )}
                          style={appearance.accentTextStyle}
                        >
                          WhatsApp
                        </span>
                      </a>
                    )}

                    {profile.contactEmail && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Show email"
                            className={cn(
                              "flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-full border px-4 transition",
                              appearance.contactButtonClass,
                            )}
                            style={appearance.accentIconStyle}
                          >
                            <Mail
                              className={cn(
                                "h-4 w-4",
                                appearance.iconColorClass,
                              )}
                              style={appearance.accentTextStyle}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                appearance.iconColorClass,
                              )}
                              style={appearance.accentTextStyle}
                            >
                              Email
                            </span>
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
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </TooltipProvider>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("rounded-full", appearance.buttonClass)}
                        style={appearance.accentButtonStyle}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Share Kit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share Kit</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex flex-col items-center gap-3">
                          <img
                            src={qrCodeUrl}
                            alt="QR code for seller profile"
                            className="h-40 w-40 rounded-lg border bg-white p-2"
                          />
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" />
                            QR code for packaging, stories, or receipts
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleCopyText(profileUrl)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Profile Link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleCopyText(
                                whatsappShareCopy,
                                "WhatsApp text copied",
                              )
                            }
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy WhatsApp Share Text
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleCopyText(
                                instagramBioCopy,
                                "Instagram bio text copied",
                              )
                            }
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Instagram Bio Copy
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {!isOwner && me?.user ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Report Seller
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Report Seller</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <Input
                            value={reportSellerReason}
                            onChange={(event) =>
                              setReportSellerReason(event.target.value)
                            }
                            placeholder="Reason"
                          />
                          <Textarea
                            value={reportSellerMessage}
                            onChange={(event) =>
                              setReportSellerMessage(event.target.value)
                            }
                            placeholder="Add details (optional)"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setReportSellerReason("");
                                setReportSellerMessage("");
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              disabled={
                                reportSellerMutation.isPending ||
                                !reportSellerReason.trim()
                              }
                              onClick={() =>
                                reportSellerMutation.mutate({
                                  reason: reportSellerReason.trim(),
                                  message:
                                    reportSellerMessage.trim() || undefined,
                                })
                              }
                            >
                              {reportSellerMutation.isPending
                                ? "Submitting..."
                                : "Submit Report"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
          <div className="order-2 space-y-8 xl:order-1">
            <section className="w-full">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p
                    className={cn(
                      "text-xs uppercase tracking-[0.22em]",
                      appearance.mutedTextClass,
                    )}
                  >
                    Buyer Proof
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    Reviews and buyer confidence
                  </h2>
                  <p
                    className={cn(
                      "mt-2 max-w-2xl text-sm leading-6",
                      appearance.mutedTextClass,
                    )}
                  >
                    Buyers can see recent experiences, seller responses, and the
                    overall rating before they decide to place an order.
                  </p>
                </div>
                <div className="flex shrink-0">
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
                          appearance.buttonClass,
                        )}
                        style={appearance.accentButtonStyle}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" /> Already
                        Reviewed
                      </Button>
                    ) : (
                      <Dialog
                        open={isReviewOpen}
                        onOpenChange={setIsReviewOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-full border-0",
                              appearance.buttonClass,
                            )}
                            style={appearance.accentButtonStyle}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" /> Write
                            Review
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
                                style={appearance.accentButtonStyle}
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
                        appearance.buttonClass,
                      )}
                      style={appearance.accentButtonStyle}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Sign in as a
                      user to give review
                    </Button>
                  )}
                </div>
              </div>

              {user && (
                <ReviewsSection
                  userId={user.id}
                  initialReviews={data?.reviews}
                  initialStats={data?.stats}
                  initialNextCursor={data?.nextCursor}
                  appearance={appearance}
                  canReport={!isOwner && Boolean(me?.user)}
                  onReportReview={(reviewId, payload) =>
                    reportReviewMutation.mutate({ reviewId, ...payload })
                  }
                  isSubmittingReport={reportReviewMutation.isPending}
                />
              )}
            </section>
          </div>

          <div className="order-1 space-y-6 xl:order-2">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(
                "rounded-[1.75rem] border p-5",
                appearance.surfaceClass,
              )}
              style={appearance.accentCardStyle}
            >
              <div className="mb-5">
                <p
                  className={cn(
                    "text-xs uppercase tracking-[0.22em]",
                    appearance.mutedTextClass,
                  )}
                >
                  Buy Channels
                </p>
                <h2 className="mt-2 text-xl font-semibold">Shop & contact</h2>
                <p className={cn("text-sm mt-1", appearance.mutedTextClass)}>
                  Direct ways to reach this seller and buy with confidence.
                </p>
              </div>

              <div className="space-y-3">
                {activeLinks.length > 0 ? (
                  activeLinks.map((link, index) => (
                    <motion.a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!user?.id) return;
                        const key = `tt-click-${user.id}-${getDayKey()}`;
                        if (shouldSampleSessionEvent(key)) {
                          void api.trackProfileClick(user.id).catch(() => { });
                        }
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="block"
                    >
                      <div
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                          appearance.surfaceMutedClass,
                        )}
                        style={appearance.accentCardStyle}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full border flex items-center justify-center shrink-0",
                              appearance.linkIconClass,
                            )}
                            style={appearance.accentIconStyle}
                          >
                            {(() => {
                              const Icon = getPlatformIcon(link.icon);
                              return (
                                <Icon
                                  className={cn(
                                    "h-5 w-5",
                                    appearance.iconColorClass,
                                  )}
                                  style={appearance.accentTextStyle}
                                />
                              );
                            })()}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-semibold truncate",
                                appearance.primaryTextClass,
                              )}
                              style={appearance.accentTextStyle}
                            >
                              {link.title}
                            </p>
                            <p
                              className={cn(
                                "text-xs truncate",
                                appearance.mutedTextClass,
                              )}
                            >
                              Open link
                            </p>
                          </div>
                        </div>
                        <ExternalLink
                          className={cn(
                            "w-4 h-4 opacity-50 transition-opacity",
                            appearance.iconColorClass,
                          )}
                        />
                      </div>
                    </motion.a>
                  ))
                ) : (
                  <div
                    className={cn(
                      "rounded-2xl border border-dashed p-5 text-sm text-center",
                      appearance.surfaceMutedClass,
                    )}
                  >
                    No public links yet.
                  </div>
                )}
              </div>
            </motion.section>
          </div>
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

function ProfileAnimatedBackground({
  preset,
  overlayClass,
}: {
  preset: "antigravity" | "aurora" | "iridescence";
  overlayClass?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {preset === "antigravity" && (
        <Antigravity count={300} color="#FF9FFC" particleSize={2} />
      )}
      {preset === "aurora" && (
        <Aurora
          colorStops={["#5227FF", "#7cff67", "#5227FF"]}
          amplitude={1}
          blend={0.5}
        />
      )}
      {preset === "iridescence" && (
        <Iridescence speed={1} amplitude={0.1} mouseReact />
      )}
      {overlayClass && <div className={cn("absolute inset-0", overlayClass)} />}
    </div>
  );
}
