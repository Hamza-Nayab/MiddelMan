import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ProfilePreviewPhone } from "@/components/ProfilePreviewPhone";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, Link as LinkType, ApiError } from "@/lib/api";
import { compressAvatar } from "@/lib/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import {
  Plus,
  GripVertical,
  Trash2,
  ExternalLink,
  BarChart3,
  Palette,
  User,
  Star,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, normalizeToE164 } from "@/lib/phone";
import {
  avatarOptions,
  getAvatarId,
  platformIconMap,
  platformOptions,
  type PlatformKey,
} from "@/lib/graphics";
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

const disputeReasons = [
  { value: "inappropriate-review", label: "Inappropriate Review" },
  { value: "fake-review", label: "Fake Review" },
  { value: "incorrect-information", label: "Incorrect Information" },
  { value: "response-already-given", label: "Response Already Given" },
  { value: "other", label: "Other" },
];

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
  } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
  });

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
    queryKey: ["links"],
    queryFn: () => api.getLinks().then((response) => response.links),
    enabled: !!user,
  });

  useEffect(() => {
    if (!links) return;
    const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
    setOrderedLinks(sorted);
    originalOrderRef.current = sorted.map((link) => link.id);
  }, [links]);

  const { data: reviewsResponse, isLoading: isReviewsLoading } = useQuery({
    queryKey: ["owner-reviews"],
    queryFn: () => api.getOwnerReviews(),
    enabled: !!user,
  });

  const { data: analyticsResponse, isFetching: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics", 14],
    queryFn: () => api.getAnalytics(14),
    enabled: activeTab === "analytics" && !!user,
    staleTime: 60_000,
  });

  const reviews = reviewsResponse?.reviews || [];
  const reviewStats = reviewsResponse?.stats || {
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
  const ratingCounts = [1, 2, 3, 4, 5].map((rating) =>
    reviews.reduce(
      (count, review) => (review.rating === rating ? count + 1 : count),
      0,
    ),
  );
  const pieData = [5, 4, 3, 2, 1].map((rating, index) => ({
    name: `${rating} Stars`,
    value: ratingCounts[rating - 1] || 0,
    color: RATING_COLORS[4 - index],
  }));

  // Mutations
  const addLinkMutation = useMutation({
    mutationFn: (values: z.infer<typeof LinkFormSchema>) => api.addLink(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setIsAddLinkOpen(false);
      toast({ title: "Link Added", description: "Your new link is live." });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: number) => api.deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      toast({ title: "Link Deleted", description: "Link has been removed." });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<LinkType> }) =>
      api.updateLink(id, updates as Parameters<typeof api.updateLink>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });

  const reorderLinksMutation = useMutation({
    mutationFn: (nextLinks: LinkType[]) =>
      api.reorderLinks(nextLinks.map((link) => link.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
    onError: (error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveLink = (dragId: number, targetId: number) => {
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
  };

  const handleLinkDrop = (targetId: number, draggedId?: number) => {
    const effectiveDraggedId = draggedId ?? draggedLinkId;
    if (effectiveDraggedId === null) return;
    moveLink(effectiveDraggedId, targetId);
  };

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

  const onSubmit = (values: z.infer<typeof LinkFormSchema>) => {
    addLinkMutation.mutate(values);
  };

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
  const getPlatformIcon = (icon?: string | null) => {
    const IconComponent =
      platformIconMap[(icon as PlatformKey) || "website"] ||
      platformIconMap.website;
    return IconComponent;
  };

  const createDisputeMutation = useMutation({
    mutationFn: ({
      reviewId,
      data,
    }: {
      reviewId: number;
      data: z.infer<typeof DisputeFormSchema>;
    }) => api.createReviewDispute(reviewId, data),
    onSuccess: async (result, variables) => {
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

      queryClient.invalidateQueries({ queryKey: ["owner-reviews"] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner-reviews"] });
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
        onComplete={() => {
          setShowOnboardingWizard(false);
          queryClient.invalidateQueries({ queryKey: ["me"] });
        }}
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
                <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full h-12 border-dashed border-2 bg-transparent text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 shadow-none"
                              disabled={orderedLinks.length >= 12}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add New Link{" "}
                              {orderedLinks.length > 0 &&
                                `(${orderedLinks.length}/12)`}
                            </Button>
                          </DialogTrigger>
                        </div>
                      </TooltipTrigger>
                      {orderedLinks.length >= 12 && (
                        <TooltipContent>
                          <p>Maximum of 12 links allowed</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Link</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={form.control}
                          name="icon"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Platform</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-3 gap-3">
                                  {platformOptions.map((option) => {
                                    const isSelected =
                                      field.value === option.key;
                                    return (
                                      <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => {
                                          field.onChange(option.key);
                                          if (!form.getValues("title")) {
                                            form.setValue(
                                              "title",
                                              option.label,
                                              {
                                                shouldDirty: true,
                                              },
                                            );
                                          }
                                        }}
                                        className={cn(
                                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                                          isSelected
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/40",
                                        )}
                                      >
                                        {(() => {
                                          const Icon = option.icon;
                                          return <Icon className="h-5 w-5" />;
                                        })()}
                                        <span>{option.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="My Portfolio" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={
                                    selectedPlatform?.urlHint ||
                                    "https://example.com"
                                  }
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={addLinkMutation.isPending}
                          >
                            {addLinkMutation.isPending
                              ? "Adding..."
                              : "Add Link"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <div className="space-y-3">
                  {isLinksLoading ? (
                    <div className="text-center py-10 text-muted-foreground">
                      Loading links...
                    </div>
                  ) : links?.length === 0 ? (
                    <div className="text-center py-10 border rounded-xl border-dashed">
                      <p className="text-muted-foreground">
                        No links yet. Add your first one above!
                      </p>
                    </div>
                  ) : (
                    orderedLinks?.map((link) => (
                      <Card
                        key={link.id}
                        className="group hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(event) => {
                          setDraggedLinkId(link.id);
                          dragStartOrderRef.current = orderedLinks.map(
                            (item) => item.id,
                          );
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(
                            "text/plain",
                            String(link.id),
                          );
                        }}
                        onDragEnd={() => {
                          setDraggedLinkId(null);
                          lastOverIdRef.current = null;
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedLinkId === null) return;
                          if (lastOverIdRef.current === link.id) return;
                          lastOverIdRef.current = link.id;
                          moveLink(draggedLinkId, link.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const data = event.dataTransfer.getData("text/plain");
                          const parsed = Number(data);
                          handleLinkDrop(
                            link.id,
                            Number.isNaN(parsed) ? undefined : parsed,
                          );
                        }}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="cursor-move text-muted-foreground/50 hover:text-muted-foreground">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {(() => {
                              const Icon = getPlatformIcon(link.icon);
                              return <Icon className="h-6 w-6" />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {link.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {link.url}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={link.isActive}
                              onCheckedChange={(checked) =>
                                updateLinkMutation.mutate({
                                  id: link.id,
                                  updates: { isActive: checked },
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                {orderedLinks.length > 0 ? (
                  <div className="flex justify-end">
                    <Button
                      variant={hasOrderChanges ? "default" : "outline"}
                      disabled={
                        !hasOrderChanges || reorderLinksMutation.isPending
                      }
                      onClick={() =>
                        reorderLinksMutation.mutate(
                          orderedLinks.map((link, index) => ({
                            ...link,
                            sortOrder: index,
                          })),
                        )
                      }
                    >
                      {reorderLinksMutation.isPending
                        ? "Saving..."
                        : "Save order"}
                    </Button>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" /> Profile Details
                    </CardTitle>
                    <CardDescription>
                      Update how your public profile appears.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user?.username && (
                      <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Username</p>
                            <p className="text-sm text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
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
                                  onSubmit={usernameForm.handleSubmit(
                                    (values) =>
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
                                              field.onChange(
                                                e.target.value.toLowerCase(),
                                              )
                                            }
                                          />
                                        </FormControl>
                                        {usernameInput &&
                                          usernameInput ===
                                            (user.username ?? "") && (
                                            <p className="text-xs text-muted-foreground">
                                              This is already your current
                                              username.
                                            </p>
                                          )}
                                        {usernameAvailability.status ===
                                          "checking" && (
                                          <p className="text-xs text-muted-foreground">
                                            Checking availability...
                                          </p>
                                        )}
                                        {usernameAvailability.status ===
                                          "available" && (
                                          <p className="text-xs text-emerald-600">
                                            Username is available.
                                          </p>
                                        )}
                                        {usernameAvailability.status ===
                                          "taken" && (
                                          <div className="space-y-2">
                                            <p className="text-xs text-amber-600">
                                              Username is taken.
                                            </p>
                                            {usernameAvailability.suggestions
                                              .length > 0 && (
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
                                                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80"
                                                    >
                                                      {suggestion}
                                                    </button>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {usernameAvailability.status ===
                                          "invalid" && (
                                          <p className="text-xs text-destructive">
                                            5-20 chars, lowercase only (a-z,
                                            0-9, ._-)
                                          </p>
                                        )}
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p>
                                      Remaining changes:{" "}
                                      {remainingUsernameChanges} / 3
                                    </p>
                                    {usernameCooldownActive &&
                                      nextUsernameChangeAt && (
                                        <p className="text-amber-600">
                                          Next change in{" "}
                                          {daysUntilUsernameChange} day(s)
                                          (available{" "}
                                          {nextUsernameChangeAt.toDateString()})
                                        </p>
                                      )}
                                    {remainingUsernameChanges === 0 && (
                                      <p className="text-destructive">
                                        You have reached the lifetime limit of 3
                                        changes.
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
                                    Max 3 lifetime changes. 30-day cooldown
                                    between changes. Contact
                                    Support@MiddelMen.com for further questions.
                                  </p>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                    {user?.email && (
                      <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    )}
                    <Form {...profileForm}>
                      <form
                        onSubmit={profileForm.handleSubmit((values) =>
                          updateProfileMutation.mutate(values),
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={profileForm.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Seller Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Short seller bio"
                                  maxLength={160}
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="avatarUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Avatar</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-4 gap-3">
                                  {avatarOptions.map((option) => {
                                    const isCustomValue =
                                      option.id === "custom" &&
                                      typeof field.value === "string" &&
                                      (field.value.startsWith("data:") ||
                                        field.value.startsWith("http"));
                                    const isSelected =
                                      field.value === option.id ||
                                      isCustomValue;
                                    const customPreview =
                                      customAvatarPreview ||
                                      (isCustomValue
                                        ? field.value
                                        : option.url);
                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                          if (option.id === "custom") {
                                            avatarInputRef.current?.click();
                                            return;
                                          }
                                          field.onChange(option.id);
                                        }}
                                        className={cn(
                                          "rounded-xl border p-2 transition",
                                          isSelected
                                            ? "border-primary ring-2 ring-primary/30"
                                            : "border-border hover:border-primary/40",
                                        )}
                                      >
                                        <img
                                          src={
                                            option.id === "custom"
                                              ? customPreview
                                              : option.url
                                          }
                                          alt={option.label}
                                          className="h-16 w-16 mx-auto"
                                        />
                                        <span className="mt-2 block text-xs text-muted-foreground">
                                          {option.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;

                                  // Save input reference before async operations
                                  const inputElement = event.currentTarget;

                                  // Validate file type before compression
                                  if (
                                    ![
                                      "image/jpeg",
                                      "image/png",
                                      "image/webp",
                                    ].includes(file.type)
                                  ) {
                                    toast({
                                      title: "Unsupported format",
                                      description: "Use JPG, PNG, or WEBP.",
                                      variant: "destructive",
                                    });
                                    inputElement.value = "";
                                    return;
                                  }

                                  // Validate original file size
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: "Image too large",
                                      description: "Max size is 5MB.",
                                      variant: "destructive",
                                    });
                                    inputElement.value = "";
                                    return;
                                  }

                                  try {
                                    setIsAvatarUploading(true);

                                    // Compress avatar client-side
                                    const compressedFile =
                                      await compressAvatar(file);

                                    // Upload compressed file to server
                                    const { avatarUrl } =
                                      await api.uploadAvatar(compressedFile);

                                    setCustomAvatarPreview(avatarUrl);
                                    field.onChange(avatarUrl);

                                    toast({
                                      title: "Avatar uploaded",
                                      description:
                                        "Your avatar has been updated successfully.",
                                    });
                                  } catch (error) {
                                    const message =
                                      error instanceof Error
                                        ? error.message
                                        : "Upload failed";
                                    toast({
                                      title: "Upload failed",
                                      description: message,
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setIsAvatarUploading(false);
                                    inputElement.value = "";
                                  }
                                }}
                              />
                              {isAvatarUploading ? (
                                <p className="text-xs text-muted-foreground">
                                  Uploading avatar...
                                </p>
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="contactEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="seller@email.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <PhoneInput
                                    international
                                    withCountryCallingCode
                                    countryCallingCodeEditable={false}
                                    defaultCountry={
                                      (watchedCountryCode as any) || "US"
                                    }
                                    country={
                                      (watchedCountryCode as any) || "US"
                                    }
                                    value={field.value || ""}
                                    onChange={(value) =>
                                      field.onChange(value ?? "")
                                    }
                                    onCountryChange={(country) =>
                                      profileForm.setValue(
                                        "countryCode",
                                        country ?? "US",
                                      )
                                    }
                                    numberInputProps={{
                                      className:
                                        "w-full h-10 rounded-md border border-input bg-background px-3 text-sm",
                                      placeholder: "+1234567890",
                                    }}
                                    countrySelectProps={{
                                      className:
                                        "h-10 rounded-md border border-input bg-background px-2 text-sm",
                                    }}
                                    className="flex items-center gap-6"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={profileForm.control}
                          name="countryCode"
                          render={({ field }) => (
                            <input type="hidden" {...field} />
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="whatsappNumber"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>WhatsApp Number</FormLabel>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Same as phone
                                  </span>
                                  <Switch
                                    checked={isWhatsAppSameAsPhone}
                                    onCheckedChange={(checked) => {
                                      setIsWhatsAppSameAsPhone(checked);
                                      if (checked) {
                                        profileForm.setValue(
                                          "whatsappNumber",
                                          watchedPhoneNumber || "",
                                        );
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <PhoneInput
                                      international
                                      withCountryCallingCode
                                      countryCallingCodeEditable={false}
                                      defaultCountry={
                                        (watchedCountryCode as any) || "US"
                                      }
                                      country={
                                        (watchedCountryCode as any) || "US"
                                      }
                                      value={field.value || ""}
                                      onChange={(value) =>
                                        field.onChange(value ?? "")
                                      }
                                      onCountryChange={(country) =>
                                        profileForm.setValue(
                                          "countryCode",
                                          country ?? "US",
                                        )
                                      }
                                      numberInputProps={{
                                        className:
                                          "w-full h-10 rounded-md border border-input bg-background px-3 text-sm",
                                        placeholder: "+1234567890",
                                        disabled: isWhatsAppSameAsPhone,
                                      }}
                                      countrySelectProps={{
                                        className:
                                          "h-10 rounded-md border border-input bg-background px-2 text-sm",
                                        disabled: isWhatsAppSameAsPhone,
                                      }}
                                      className="flex items-center gap-6"
                                    />
                                  </div>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={!whatsappPreviewUrl}
                                            onClick={() => {
                                              if (!whatsappPreviewUrl) return;
                                              window.open(
                                                whatsappPreviewUrl,
                                                "_blank",
                                              );
                                            }}
                                            aria-label="Open WhatsApp preview"
                                          >
                                            <WhatsAppIcon className="h-4 w-4" />
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      {!whatsappPreviewUrl && (
                                        <TooltipContent>
                                          Enter a valid WhatsApp number
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending
                            ? "Saving..."
                            : "Save Changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="grid gap-4">
                  {isReviewsLoading ? (
                    <p className="text-center text-muted-foreground py-6">
                      Loading reviews...
                    </p>
                  ) : reviews.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">
                      No reviews yet.
                    </p>
                  ) : (
                    reviews.map((review) => (
                      <Card key={review.id}>
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                          <div className="flex items-center gap-2">
                            <div className="font-bold">{review.authorName}</div>
                            <div className="flex items-center text-yellow-500">
                              {Array.from({ length: review.rating }).map(
                                (_, i) => (
                                  <Star
                                    key={i}
                                    className="w-3 h-3 fill-current"
                                  />
                                ),
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <p className="text-sm mb-3">{review.comment}</p>
                          <div className="flex flex-wrap gap-2">
                            <Dialog
                              open={disputeDialogOpen === review.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setDisputeDialogOpen(null);
                                  disputeForm.reset();
                                  setEvidenceFile(null);
                                } else {
                                  setDisputeDialogOpen(review.id);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-2" />
                                  Dispute
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Dispute Review</DialogTitle>
                                </DialogHeader>
                                <Form {...disputeForm}>
                                  <form
                                    onSubmit={disputeForm.handleSubmit(
                                      (values) => {
                                        createDisputeMutation.mutate({
                                          reviewId: review.id,
                                          data: values,
                                        });
                                      },
                                    )}
                                    className="space-y-4"
                                  >
                                    <FormField
                                      control={disputeForm.control}
                                      name="reason"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Reason for Dispute
                                          </FormLabel>
                                          <FormControl>
                                            <Select
                                              value={field.value}
                                              onValueChange={field.onChange}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a reason" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {disputeReasons.map(
                                                  (reason) => (
                                                    <SelectItem
                                                      key={reason.value}
                                                      value={reason.value}
                                                    >
                                                      {reason.label}
                                                    </SelectItem>
                                                  ),
                                                )}
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
                                          <FormLabel>
                                            Message (Optional)
                                          </FormLabel>
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
                                            <p className="text-sm text-muted-foreground">
                                              {evidenceFile.name}
                                            </p>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                setEvidenceFile(null)
                                              }
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
                                                const file =
                                                  e.target.files?.[0];
                                                if (file) {
                                                  if (
                                                    file.size >
                                                    5 * 1024 * 1024
                                                  ) {
                                                    toast({
                                                      title: "File too large",
                                                      description:
                                                        "File must be less than 5MB",
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
                                                Click to upload (PDF, PNG, JPEG,
                                                WebP)
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Max 5MB
                                              </p>
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
                                          createDisputeMutation.isPending ||
                                          uploadEvidenceMutation.isPending
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
              </TabsContent>

              <TabsContent value="analytics" className="mt-6 space-y-6">
                {isAnalyticsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Loading analytics...
                      </p>
                    </div>
                  </div>
                )}
                {!isAnalyticsLoading && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Average Rating
                          </CardTitle>
                          <CardDescription>
                            Based on all reviews
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {reviewStats.totalReviews
                              ? reviewStats.avgRating.toFixed(1)
                              : "New"}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {reviewStats.totalReviews} total reviews
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Total Reviews
                          </CardTitle>
                          <CardDescription>
                            All-time submissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {reviewStats.totalReviews}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Keep collecting feedback
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Profile Visits & Clicks
                          </CardTitle>
                          <CardDescription>
                            Last 14 days performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-75">
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                              <span className="font-medium text-foreground">
                                {analyticsTotals.visits}
                              </span>
                              <span>Visits</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                              <span className="font-medium text-foreground">
                                {analyticsTotals.clicks}
                              </span>
                              <span>Clicks</span>
                            </div>
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData}>
                              <defs>
                                <linearGradient
                                  id="colorVisits"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#8b5cf6"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#8b5cf6"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                              />
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
                          <CardTitle className="text-lg">
                            Review Distribution
                          </CardTitle>
                          <CardDescription>
                            Breakdown of star ratings
                          </CardDescription>
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
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
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
