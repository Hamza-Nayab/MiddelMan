import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ProfilePreviewPhone } from "@/components/profile/ProfilePreviewPhone";
import { LinksTab } from "@/components/dashboard/LinksTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { ReviewsTab } from "@/components/dashboard/ReviewsTab";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, Link as LinkType, ApiError } from "@/lib/api";
import { compressAvatar } from "@/lib/avatar";
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, normalizeToE164 } from "@/lib/phone";
import {
  getAvatarId,
  platformIconMap,
  platformOptions,
  type PlatformKey,
} from "@/lib/graphics";
import { useMeQuery } from "@/hooks/use-me";

const LINKS_QUERY_KEY = ["links"] as const;
const OWNER_REVIEWS_QUERY_KEY = ["owner-reviews"] as const;
const OWNER_REVIEWS_INFINITE_QUERY_KEY = [
  ...OWNER_REVIEWS_QUERY_KEY,
  "infinite-v2",
] as const;

const platformKeys = platformOptions.map((option) => option.key) as [
  PlatformKey,
  ...PlatformKey[],
];

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

const LinkFormSchema = z.object({
  icon: z.enum(platformKeys),
  title: z.string().min(1, "Title is required"),
  url: z
    .string()
    .transform((val) => {
      // Automatically prepend https:// if no protocol is provided
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return `https://${val}`;
      }
      return val;
    })
    .refine((val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, "Must be a valid URL"),
});

const optionalString = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  }, schema.optional());

const phoneInputRegex = /^[0-9+\-()\s]+$/;

const ProfileFormSchema = z
  .object({
    displayName: optionalString(
      z.string().min(2, "Display name is too short").max(50),
    ),
    bio: optionalString(z.string().max(160)),
    avatarUrl: optionalString(z.string().min(1)),
    contactEmail: optionalString(z.string().email().max(254)),
    whatsappNumber: optionalString(
      z
        .string()
        .regex(phoneInputRegex, "WhatsApp number has invalid characters"),
    ),
    phoneNumber: optionalString(
      z.string().regex(phoneInputRegex, "Phone number has invalid characters"),
    ),
    countryCode: optionalString(
      z.string().length(2, "Country code must be 2 letters"),
    ),
  })
  .superRefine((values, ctx) => {
    if (values.phoneNumber) {
      const normalized = normalizeToE164(
        values.phoneNumber,
        values.countryCode,
      );
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number must be valid E.164 (8-15 digits)",
          path: ["phoneNumber"],
        });
      }
    }
    if (values.whatsappNumber) {
      const normalized = normalizeToE164(
        values.whatsappNumber,
        values.countryCode,
      );
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WhatsApp number must be valid E.164 (8-15 digits)",
          path: ["whatsappNumber"],
        });
      }
    }
  });

const DisputeFormSchema = z.object({
  reason: z.string().min(1, "Please select a reason"),
  message: z.string().max(1000).optional(),
});

const formatDayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
  });

const buildAnalyticsSeries = (
  days: Array<{ day: string; views: number; clicks: number }> | undefined,
  count: number,
) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (count - 1));

  const dayKeys = Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const dayMap = new Map((days ?? []).map((entry) => [entry.day, entry]));

  return dayKeys.map((day) => {
    const entry = dayMap.get(day);
    return {
      name: formatDayLabel(day),
      visits: entry?.views ?? 0,
      clicks: entry?.clicks ?? 0,
    };
  });
};

const RATING_COLORS = ["#ede9fe", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [orderedLinks, setOrderedLinks] = useState<LinkType[]>([]);
  const [draggedLinkId, setDraggedLinkId] = useState<number | null>(null);
  const dragStartOrderRef = useRef<number[]>([]);
  const lastOverIdRef = useRef<number | null>(null);
  const originalOrderRef = useRef<number[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(
    null,
  );
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("links");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState<number | null>(
    null,
  );
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isWhatsAppSameAsPhone, setIsWhatsAppSameAsPhone] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);

  // Auth Check
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
    if (!isUserLoading && me?.user && me.user.role !== "seller") {
      setLocation("/my-reviews");
    }
  }, [isUserLoading, me, setLocation]);

  // Check if profile is incomplete and show onboarding wizard
  useEffect(() => {
    if (me?.user?.role === "seller") {
      // Sellers only need to complete avatar selection during onboarding
      // (displayName comes from signup, username also comes from signup)
      const isIncomplete = !me.profile?.avatarUrl;
      setShowOnboardingWizard(isIncomplete);
    }
  }, [me]);

  const user = me?.user;
  const profile = me?.profile;

  // Data Fetching
  const { data: links, isLoading: isLinksLoading } = useQuery({
    queryKey: LINKS_QUERY_KEY,
    queryFn: () => api.getLinks().then((response) => response.links),
    enabled: !!user,
  });

  useEffect(() => {
    if (!links) return;
    const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
    setOrderedLinks(sorted);
    originalOrderRef.current = sorted.map((link) => link.id);
  }, [links]);

  const {
    data: reviewsResponse,
    isLoading: isReviewsLoading,
    fetchNextPage: fetchMoreReviews,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: isFetchingMoreReviews,
  } = useInfiniteQuery({
    queryKey: OWNER_REVIEWS_INFINITE_QUERY_KEY,
    queryFn: ({ pageParam = 0, signal }) =>
      api
        .getOwnerReviewsPage({
          limit: 10,
          offset: Number(pageParam),
          signal,
        })
        .then((payload) => ({
          reviews: payload.reviews,
          stats: {
            avgRating: Number(payload.stats?.avgRating ?? 0),
            totalReviews: Number(payload.stats?.totalReviews ?? 0),
          },
          meta: {
            hasMore: Boolean(payload.meta?.hasMore),
            nextOffset:
              typeof payload.meta?.nextOffset === "number"
                ? payload.meta.nextOffset
                : null,
          },
        })),
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasMore
        ? (lastPage.meta.nextOffset ?? undefined)
        : undefined,
    initialPageParam: 0,
    enabled: !!user,
  });

  const { data: analyticsResponse, isFetching: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics", 14],
    queryFn: () => api.getAnalytics(14),
    enabled: activeTab === "analytics" && !!user,
    staleTime: 60_000,
  });

  const reviews = reviewsResponse?.pages.flatMap((page) => page.reviews) || [];
  const reviewStats = reviewsResponse?.pages[0]?.stats || {
    avgRating: 0,
    totalReviews: 0,
  };
  const analyticsData = useMemo(
    () => buildAnalyticsSeries(analyticsResponse?.days, 14),
    [analyticsResponse],
  );
  const analyticsTotals = useMemo(() => {
    return analyticsData.reduce(
      (acc, entry) => ({
        visits: acc.visits + entry.visits,
        clicks: acc.clicks + entry.clicks,
      }),
      { visits: 0, clicks: 0 },
    );
  }, [analyticsData]);
  const pieData = useMemo(() => {
    const ratingCounts = [1, 2, 3, 4, 5].map((rating) =>
      reviews.reduce(
        (count, review) => (review.rating === rating ? count + 1 : count),
        0,
      ),
    );

    return [5, 4, 3, 2, 1].map((rating, index) => ({
      name: `${rating} Stars`,
      value: ratingCounts[rating - 1] || 0,
      color: RATING_COLORS[4 - index],
    }));
  }, [reviews]);

  // Mutations
  const addLinkMutation = useMutation({
    mutationFn: (values: z.infer<typeof LinkFormSchema>) => api.addLink(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
      setIsAddLinkOpen(false);
      toast({ title: "Link Added", description: "Your new link is live." });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: number) => api.deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
      toast({ title: "Link Deleted", description: "Link has been removed." });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<LinkType> }) =>
      api.updateLink(id, updates as Parameters<typeof api.updateLink>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
  });

  const reorderLinksMutation = useMutation({
    mutationFn: (nextLinks: LinkType[]) =>
      api.reorderLinks(nextLinks.map((link) => link.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveLink = useCallback(
    (dragId: number, targetId: number) => {
      if (dragId === targetId) return;
      const current = [...orderedLinks];
      const fromIndex = current.findIndex((link) => link.id === dragId);
      const toIndex = current.findIndex((link) => link.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, moved);

      const reindexed = current.map((link, index) => ({
        ...link,
        sortOrder: index,
      }));
      setOrderedLinks(reindexed);
    },
    [orderedLinks],
  );

  const handleLinkDrop = useCallback(
    (targetId: number, draggedId?: number) => {
      const effectiveDraggedId = draggedId ?? draggedLinkId;
      if (effectiveDraggedId === null) return;
      moveLink(effectiveDraggedId, targetId);
    },
    [draggedLinkId, moveLink],
  );

  const hasOrderChanges =
    orderedLinks.length !== originalOrderRef.current.length ||
    orderedLinks.some(
      (link, index) => link.id !== originalOrderRef.current[index],
    );

  const updateThemeMutation = useMutation({
    mutationFn: (theme: "light" | "dark" | "gradient") =>
      api.updateProfile({ theme }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], (old: any) =>
        old ? { ...old, profile: data.profile } : undefined,
      );
      toast({
        title: "Theme Updated",
        description: "Your profile look has been updated.",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: z.infer<typeof ProfileFormSchema>) => {
      const normalizedPhone = values.phoneNumber
        ? normalizeToE164(values.phoneNumber, values.countryCode)
        : undefined;
      const normalizedWhatsApp = values.whatsappNumber
        ? normalizeToE164(values.whatsappNumber, values.countryCode)
        : undefined;

      const payload = Object.fromEntries(
        Object.entries({
          ...values,
          phoneNumber: normalizedPhone,
          whatsappNumber: normalizedWhatsApp,
        }).filter(([, value]) => value !== undefined),
      );
      if (Object.keys(payload).length === 0) {
        return Promise.reject(new Error("No changes to save."));
      }
      return api.updateProfile(payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], (old: any) =>
        old ? { ...old, profile: data.profile } : undefined,
      );
      toast({
        title: "Profile Updated",
        description: "Your profile changes are saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof LinkFormSchema>>({
    resolver: zodResolver(LinkFormSchema),
    defaultValues: { icon: "website", title: "", url: "" },
  });

  const profileForm = useForm<z.infer<typeof ProfileFormSchema>>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      avatarUrl:
        profile?.avatarUrl &&
        (profile.avatarUrl.startsWith("data:") ||
          profile.avatarUrl.startsWith("http"))
          ? profile.avatarUrl
          : getAvatarId(profile?.avatarUrl),
      contactEmail: profile?.contactEmail || "",
      phoneNumber: profile?.phoneNumber || "",
      whatsappNumber: profile?.whatsappNumber || "",
      countryCode: profile?.countryCode || "US",
    },
  });

  useEffect(() => {
    profileForm.reset({
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      avatarUrl:
        profile?.avatarUrl &&
        (profile.avatarUrl.startsWith("data:") ||
          profile.avatarUrl.startsWith("http"))
          ? profile.avatarUrl
          : getAvatarId(profile?.avatarUrl),
      contactEmail: profile?.contactEmail || "",
      phoneNumber: profile?.phoneNumber || "",
      whatsappNumber: profile?.whatsappNumber || "",
      countryCode: profile?.countryCode || "US",
    });
    setIsWhatsAppSameAsPhone(
      !!profile?.phoneNumber && profile.phoneNumber === profile?.whatsappNumber,
    );
    if (
      profile?.avatarUrl &&
      (profile.avatarUrl.startsWith("data:") ||
        profile.avatarUrl.startsWith("http"))
    ) {
      setCustomAvatarPreview(profile.avatarUrl);
    } else {
      setCustomAvatarPreview(null);
    }
  }, [profile, profileForm]);

  const onSubmit = useCallback(
    (values: z.infer<typeof LinkFormSchema>) => {
      addLinkMutation.mutate(values);
    },
    [addLinkMutation.mutate],
  );

  const usernameForm = useForm<z.infer<typeof UsernameChangeSchema>>({
    resolver: zodResolver(UsernameChangeSchema),
    defaultValues: { username: user?.username || "" },
  });

  useEffect(() => {
    if (!user?.username) return;
    usernameForm.setValue("username", user.username);
  }, [user?.username, usernameForm]);

  const usernameInput = usernameForm.watch("username");
  const usernameToCheck =
    usernameInput && usernameInput !== (user?.username ?? "")
      ? usernameInput
      : "";
  const usernameAvailability = useUsernameAvailability(usernameToCheck);

  const usernameChangeCount = user?.usernameChangeCount ?? 0;
  const remainingUsernameChanges = Math.max(0, 3 - usernameChangeCount);
  const lastUsernameChangeAt = user?.lastUsernameChangedAt
    ? new Date(user.lastUsernameChangedAt)
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
    user?.role === "seller" &&
    remainingUsernameChanges > 0 &&
    !usernameCooldownActive;

  const changeUsernameMutation = useMutation({
    mutationFn: (values: z.infer<typeof UsernameChangeSchema>) =>
      api.changeUsername(values.username),
    onSuccess: (result) => {
      const newUsername = result.user.username;
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setIsUsernameDialogOpen(false);
      toast({ title: "Username updated successfully" });
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

  const selectedPlatformKey = form.watch("icon");
  const selectedPlatform = platformOptions.find(
    (option) => option.key === selectedPlatformKey,
  );
  const getPlatformIcon = useCallback((icon?: string | null) => {
    const IconComponent =
      platformIconMap[(icon as PlatformKey) || "website"] ||
      platformIconMap.website;
    return IconComponent;
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboardingWizard(false);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const createDisputeMutation = useMutation({
    mutationFn: ({
      reviewId,
      data,
    }: {
      reviewId: number;
      data: z.infer<typeof DisputeFormSchema>;
    }) => api.createReviewDispute(reviewId, data),
    onSuccess: async (_, variables) => {
      // If evidence file exists, upload it
      if (evidenceFile) {
        try {
          await uploadEvidenceMutation.mutateAsync({
            reviewId: variables.reviewId,
            file: evidenceFile,
          });
        } catch (error) {
          // Evidence upload failed, but dispute was created
          console.error("Evidence upload failed:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: OWNER_REVIEWS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      setDisputeDialogOpen(null);
      setEvidenceFile(null);
      disputeForm.reset();
      toast({
        title: "Dispute created",
        description: evidenceFile
          ? "Your dispute and evidence have been submitted."
          : "Your dispute has been submitted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Dispute creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: ({ reviewId, file }: { reviewId: number; file: File }) =>
      api.uploadDisputeEvidence(reviewId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNER_REVIEWS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (error) => {
      console.error("Evidence upload error:", error);
      toast({
        title: "Evidence upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disputeForm = useForm<z.infer<typeof DisputeFormSchema>>({
    resolver: zodResolver(DisputeFormSchema),
    defaultValues: {
      reason: "",
      message: "",
    },
  });

  const watchedDisplayName = profileForm.watch("displayName");
  const watchedBio = profileForm.watch("bio");
  const watchedAvatar = profileForm.watch("avatarUrl");
  const watchedPhoneNumber = profileForm.watch("phoneNumber");
  const watchedWhatsAppNumber = profileForm.watch("whatsappNumber");
  const watchedCountryCode = profileForm.watch("countryCode");
  const watchedContactEmail = profileForm.watch("contactEmail");

  useEffect(() => {
    if (!isWhatsAppSameAsPhone) return;
    profileForm.setValue("whatsappNumber", watchedPhoneNumber || "");
  }, [isWhatsAppSameAsPhone, watchedPhoneNumber, profileForm]);

  if (isUserLoading || !user || !profile) {
    return null;
  }

  const whatsappPreviewE164 = normalizeToE164(
    watchedWhatsAppNumber || "",
    watchedCountryCode,
  );
  const whatsappPreviewUrl = whatsappPreviewE164
    ? buildWhatsAppUrl(whatsappPreviewE164)
    : null;

  const WhatsAppIcon = platformIconMap.whatsapp;

  return (
    <Layout>
      <OnboardingWizard
        open={showOnboardingWizard}
        onComplete={handleOnboardingComplete}
        currentProfile={profile}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {profile.displayName}.
                </p>
              </div>
              <Link
                href={user.username ? `/${user.username}` : "/"}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                View Profile <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-5 w-full md:w-auto">
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="appearance">Design</TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="space-y-4 mt-6">
                <LinksTab
                  isAddLinkOpen={isAddLinkOpen}
                  setIsAddLinkOpen={setIsAddLinkOpen}
                  orderedLinks={orderedLinks}
                  isLinksLoading={isLinksLoading}
                  links={links}
                  form={form}
                  onSubmit={onSubmit}
                  selectedPlatform={selectedPlatform}
                  addLinkMutation={addLinkMutation}
                  draggedLinkId={draggedLinkId}
                  setDraggedLinkId={setDraggedLinkId}
                  dragStartOrderRef={dragStartOrderRef}
                  lastOverIdRef={lastOverIdRef}
                  moveLink={moveLink}
                  handleLinkDrop={handleLinkDrop}
                  getPlatformIcon={getPlatformIcon}
                  updateLinkMutation={updateLinkMutation}
                  deleteLinkMutation={deleteLinkMutation}
                  hasOrderChanges={hasOrderChanges}
                  reorderLinksMutation={reorderLinksMutation}
                />
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <ProfileTab
                  user={user}
                  profileForm={profileForm}
                  updateProfileMutation={updateProfileMutation}
                  isUsernameDialogOpen={isUsernameDialogOpen}
                  setIsUsernameDialogOpen={setIsUsernameDialogOpen}
                  usernameForm={usernameForm}
                  changeUsernameMutation={changeUsernameMutation}
                  usernameInput={usernameInput}
                  usernameAvailability={usernameAvailability}
                  remainingUsernameChanges={remainingUsernameChanges}
                  usernameCooldownActive={usernameCooldownActive}
                  nextUsernameChangeAt={nextUsernameChangeAt}
                  daysUntilUsernameChange={daysUntilUsernameChange}
                  canChangeUsername={canChangeUsername}
                  avatarInputRef={avatarInputRef}
                  customAvatarPreview={customAvatarPreview}
                  setCustomAvatarPreview={setCustomAvatarPreview}
                  isAvatarUploading={isAvatarUploading}
                  setIsAvatarUploading={setIsAvatarUploading}
                  compressAvatar={compressAvatar}
                  api={api}
                  toast={toast}
                  isWhatsAppSameAsPhone={isWhatsAppSameAsPhone}
                  setIsWhatsAppSameAsPhone={setIsWhatsAppSameAsPhone}
                  watchedCountryCode={watchedCountryCode}
                  watchedPhoneNumber={watchedPhoneNumber}
                  whatsappPreviewUrl={whatsappPreviewUrl}
                  WhatsAppIcon={WhatsAppIcon}
                />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewsTab
                  isReviewsLoading={isReviewsLoading}
                  reviews={reviews}
                  disputeDialogOpen={disputeDialogOpen}
                  setDisputeDialogOpen={setDisputeDialogOpen}
                  disputeForm={disputeForm}
                  createDisputeMutation={createDisputeMutation}
                  evidenceFile={evidenceFile}
                  setEvidenceFile={setEvidenceFile}
                  uploadEvidenceMutation={uploadEvidenceMutation}
                  toast={toast}
                  hasMoreReviews={hasMoreReviews}
                  fetchMoreReviews={fetchMoreReviews}
                  isFetchingMoreReviews={isFetchingMoreReviews}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-6 space-y-6">
                <AnalyticsTab
                  isAnalyticsLoading={isAnalyticsLoading}
                  reviewStats={reviewStats}
                  analyticsTotals={analyticsTotals}
                  analyticsData={analyticsData}
                  pieData={pieData}
                />
              </TabsContent>

              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Selection</CardTitle>
                    <CardDescription>
                      Choose how your public profile looks to visitors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      <button
                        onClick={() => updateThemeMutation.mutate("light")}
                        className={cn(
                          "group relative aspect-9/16 rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105",
                          profile.theme === "light"
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                      >
                        <div className="absolute inset-0 bg-white">
                          <div className="h-1/3 bg-slate-100 p-4 flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="h-8 rounded-lg bg-slate-100 border border-slate-200"></div>
                            <div className="h-8 rounded-lg bg-slate-100 border border-slate-200"></div>
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-white/90 backdrop-blur-sm border-t">
                          <span className="font-semibold text-sm">Light</span>
                        </div>
                      </button>

                      <button
                        onClick={() => updateThemeMutation.mutate("dark")}
                        className={cn(
                          "group relative aspect-9/16 rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105",
                          profile.theme === "dark"
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                      >
                        <div className="absolute inset-0 bg-slate-950">
                          <div className="h-1/3 bg-slate-900 p-4 flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-800"></div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="h-8 rounded-lg bg-slate-900 border border-slate-800"></div>
                            <div className="h-8 rounded-lg bg-slate-900 border border-slate-800"></div>
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-slate-950/90 backdrop-blur-sm border-t border-white/10">
                          <span className="font-semibold text-sm text-white">
                            Dark
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => updateThemeMutation.mutate("gradient")}
                        className={cn(
                          "group relative aspect-9/16 rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105",
                          profile.theme === "gradient"
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                      >
                        <div className="absolute inset-0 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500">
                          <div className="h-1/3 p-4 flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md"></div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30"></div>
                            <div className="h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30"></div>
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-black/20 backdrop-blur-sm border-t border-white/10">
                          <span className="font-semibold text-sm text-white">
                            Gradient
                          </span>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Phone */}
          <ProfilePreviewPhone
            displayName={watchedDisplayName || profile.displayName}
            username={user.username || ""}
            bio={watchedBio || profile.bio}
            avatarValue={watchedAvatar || profile.avatarUrl}
            userId={user.id}
            links={orderedLinks}
            avgRating={reviewStats.avgRating}
            totalReviews={reviewStats.totalReviews}
            phoneNumber={watchedPhoneNumber || profile.phoneNumber}
            whatsappNumber={watchedWhatsAppNumber || profile.whatsappNumber}
            countryCode={watchedCountryCode || profile.countryCode}
            contactEmail={watchedContactEmail || profile.contactEmail}
          />
        </div>
      </div>
    </Layout>
  );
}
