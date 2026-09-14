import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { api, Profile } from "@/lib/api";
import { compressAvatar } from "@/lib/avatar";
import { PRESET_AVATARS, getDefaultPresetAvatar } from "@/lib/preset-avatars";
import { getAvatarId, getAvatarUrl, isCustomAvatar } from "@/lib/graphics";
import { Upload, AlertCircle } from "lucide-react";

const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name cannot exceed 50 characters")
  .regex(
    /^[\p{L}\p{N}\s\-_.,!?'"()]+$/u,
    "Display name contains invalid characters",
  );

const bioSchema = z
  .string()
  .min(10, "Bio must be at least 10 characters")
  .max(500, "Bio cannot exceed 500 characters");

const onboardingSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  currentProfile?: Profile | null;
}

export function OnboardingWizard({
  open,
  onComplete,
  currentProfile,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<"bio" | "avatar" | "confirm">("bio");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(
    isCustomAvatar(currentProfile?.avatarUrl)
      ? currentProfile!.avatarUrl!
      : currentProfile?.avatarUrl || "avatar-1",
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: currentProfile?.displayName || "",
      bio: currentProfile?.bio || "",
    },
  });

  useEffect(() => {
    if (currentProfile?.displayName && !form.getValues("displayName")) {
      form.setValue("displayName", currentProfile.displayName);
    }
    if (currentProfile?.bio && !form.getValues("bio")) {
      form.setValue("bio", currentProfile.bio);
    }
    if (currentProfile?.avatarUrl && selectedAvatarUrl === "avatar-1") {
      setSelectedAvatarUrl(currentProfile.avatarUrl);
    }
  }, [currentProfile, form, selectedAvatarUrl]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (values: OnboardingForm) => {
      // Normalize preset avatar Vite asset paths to canonical IDs (e.g. "avatar-15")
      // before sending to server. Custom uploads (data: or http) are sent as-is.
      const avatarValue = isCustomAvatar(selectedAvatarUrl)
        ? selectedAvatarUrl
        : getAvatarId(selectedAvatarUrl);

      return api.completeOnboarding({
        displayName: values.displayName,
        avatarUrl: avatarValue,
        bio: values.bio,
      });
    },
    onSuccess: () => {
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({
        title: "Profile complete!",
        description: "Your seller profile has been set up successfully.",
      });
      onComplete();
    },
    onError: (error: any) => {
      // Try to extract field-level errors from the server response
      let errorMessage =
        error?.message || "Something went wrong. Please try again.";
      let navigateToStep: "bio" | "avatar" | null = null;

      // Parse structured validation errors from the API
      const details = error?.details || error?.error?.details;
      if (details?.fieldErrors) {
        const fieldErrors = details.fieldErrors as Record<string, string[]>;
        const fieldNames = Object.keys(fieldErrors);
        const messages = fieldNames
          .map((field) => `${field}: ${fieldErrors[field].join(", ")}`)
          .join("; ");
        errorMessage = messages || errorMessage;

        // Navigate to the step that has the error
        if (fieldNames.some((f) => f === "displayName" || f === "bio")) {
          navigateToStep = "bio";
        } else if (fieldNames.some((f) => f === "avatarUrl")) {
          navigateToStep = "avatar";
        }
      }

      // Check for common error patterns in the message
      if (/display\s*name/i.test(errorMessage) || /bio/i.test(errorMessage)) {
        navigateToStep = navigateToStep || "bio";
      } else if (/avatar/i.test(errorMessage)) {
        navigateToStep = navigateToStep || "avatar";
      }

      setSubmitError(errorMessage);

      if (navigateToStep) {
        setStep(navigateToStep);
      }

      toast({
        title: "Setup failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const compressed = await compressAvatar(file);
      const result = await api.uploadAvatar(compressed);
      setSelectedAvatarUrl(result.avatarUrl);
      toast({
        title: "Avatar uploaded",
        description: "Your new avatar has been set.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNext = async () => {
    setSubmitError(null);

    if (step === "bio") {
      const isBioStepValid = await form.trigger(["displayName", "bio"], {
        shouldFocus: true,
      });
      if (!isBioStepValid) {
        // Build a specific error message from the form errors
        const errors = form.formState.errors;
        const errorParts: string[] = [];
        if (errors.displayName) {
          errorParts.push(`Display Name: ${errors.displayName.message}`);
        }
        if (errors.bio) {
          errorParts.push(`Bio: ${errors.bio.message}`);
        }

        setSubmitError(
          errorParts.join(" · ") || "Please fix the highlighted fields.",
        );
        return;
      }

      setStep("avatar");
    } else if (step === "avatar") {
      setStep("confirm");
    }
  };

  const handlePrevious = () => {
    setSubmitError(null);

    if (step === "confirm") {
      setStep("avatar");
    } else if (step === "avatar") {
      setStep("bio");
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const valid = await form.trigger(["displayName", "bio"], {
      shouldFocus: true,
    });

    if (!valid) {
      const errors = form.formState.errors;
      const errorParts: string[] = [];
      if (errors.displayName) {
        errorParts.push(`Display Name: ${errors.displayName.message}`);
      }
      if (errors.bio) {
        errorParts.push(`Bio: ${errors.bio.message}`);
      }

      setStep("bio");
      setSubmitError(
        errorParts.join(" · ") || "Please complete the required fields.",
      );
      toast({
        title: "Please complete required fields",
        description:
          errorParts.join(" · ") ||
          "Add a valid display name and bio to finish onboarding.",
        variant: "destructive",
      });
      return;
    }

    completeOnboardingMutation.mutate(form.getValues());
  };

  const ErrorBanner = () =>
    submitError ? (
      <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{submitError}</span>
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md w-[calc(100vw-2rem)] max-h-[92dvh] flex flex-col p-0 overflow-hidden gap-0 [&>button]:hidden sm:rounded-2xl shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Tabs
          value={step}
          onValueChange={(val) => setStep(val as "bio" | "avatar" | "confirm")}
          className="flex flex-col flex-1 min-h-0 w-full"
        >
          {/* Pinned Header */}
          <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-border/60 shrink-0 bg-background">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold font-heading">
                Complete Your Seller Profile
              </DialogTitle>
            </DialogHeader>

            <TabsList className="grid w-full grid-cols-3 mt-3">
              <TabsTrigger value="bio" disabled={step === "bio"}>
                Bio
              </TabsTrigger>
              <TabsTrigger value="avatar" disabled={step === "avatar"}>
                Avatar
              </TabsTrigger>
              <TabsTrigger value="confirm" disabled={step === "confirm"}>
                Done
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 min-h-0">
            {/* Step 1: Bio */}
            <TabsContent value="bio" className="mt-0 space-y-4 focus-visible:outline-none">
              <div className="text-sm text-muted-foreground">
                Tell us about you and your business.
              </div>

              <ErrorBanner />

              <Form {...form}>
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name or business name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share a bit about yourself and what you offer..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </TabsContent>

            {/* Step 2: Avatar */}
            <TabsContent value="avatar" className="mt-0 space-y-4 focus-visible:outline-none">
              <div className="text-sm text-muted-foreground">
                Choose or upload an avatar.
              </div>

              <ErrorBanner />

              {/* Selected avatar preview */}
              <div className="flex justify-center">
                <img
                  src={getAvatarUrl(selectedAvatarUrl)}
                  alt="Selected avatar"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-3 sm:border-4 border-primary/20 shadow-md object-cover"
                />
              </div>

              {/* Grid avatar selector */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium">
                  Select or upload an avatar:
                </p>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                  {/* Upload custom button */}
                  <label className="flex flex-col items-center justify-center cursor-pointer group aspect-square w-full rounded-xl border-2 border-dashed border-border group-hover:border-primary/60 bg-muted/50 group-hover:bg-muted/80 transition p-1 text-center">
                    <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary mt-1">
                      Upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>

                  {/* Preset avatars grid */}
                  {PRESET_AVATARS.map((url, index) => {
                    const avatarId = `avatar-${index + 1}`;
                    const isSelected =
                      selectedAvatarUrl === avatarId ||
                      selectedAvatarUrl === url ||
                      getAvatarId(selectedAvatarUrl) === avatarId;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(avatarId)}
                        className={`relative aspect-square w-full rounded-xl border-2 overflow-hidden transition p-1 bg-muted/20 ${
                          isSelected
                            ? "border-primary ring-2 ring-primary ring-offset-1 shadow-md scale-[0.98]"
                            : "border-border/80 hover:border-primary/50 hover:shadow-xs"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Avatar ${index + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {uploadingAvatar && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Spinner className="h-3 w-3" />
                  Uploading...
                </p>
              )}
            </TabsContent>

            {/* Step 3: Confirm */}
            <TabsContent value="confirm" className="mt-0 space-y-4 focus-visible:outline-none">
              <div className="text-sm text-muted-foreground mb-2">
                Here's a preview of your seller profile:
              </div>

              <ErrorBanner />

              <div className="space-y-3 border rounded-xl p-4 bg-muted/10">
                <div className="flex justify-center">
                  <img
                    src={getAvatarUrl(selectedAvatarUrl)}
                    alt="Your avatar"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-border shadow-sm object-cover"
                  />
                </div>

                <div className="text-center">
                  <p className="font-semibold text-base">{form.watch("displayName")}</p>
                  <p className="text-xs text-muted-foreground">Seller Profile</p>
                </div>

                {form.watch("bio") && (
                  <div className="text-center px-2">
                    <p className="text-xs text-muted-foreground italic line-clamp-3">
                      {form.watch("bio")}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                You can change these anytime in your profile settings.
              </p>
            </TabsContent>
          </div>

          {/* Pinned Footer */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={handlePrevious}
              disabled={step === "bio" || completeOnboardingMutation.isPending}
            >
              Back
            </Button>

            {step === "confirm" ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={completeOnboardingMutation.isPending}
              >
                {completeOnboardingMutation.isPending ? "Saving..." : "Complete"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={completeOnboardingMutation.isPending}
              >
                Next
              </Button>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
