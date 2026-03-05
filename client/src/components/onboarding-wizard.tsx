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
import { Upload, AlertCircle } from "lucide-react";

const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name must be at most 50 characters")
  .regex(
    /^[\p{L}\p{N}\s\-_.,!?'"()]+$/u,
    "Display name contains invalid characters",
  );

const bioSchema = z
  .string()
  .min(10, "Bio must be at least 10 characters")
  .max(500, "Bio must be at most 500 characters");

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
    currentProfile?.avatarUrl || getDefaultPresetAvatar(),
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: currentProfile?.displayName || "",
      bio: currentProfile?.bio || "",
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (values: OnboardingForm) => {
      return api.completeOnboarding({
        displayName: values.displayName,
        avatarUrl: selectedAvatarUrl,
        bio: values.bio,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({
        title: "Profile complete!",
        description: "Your seller profile has been set up successfully.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (step === "bio") {
      setStep("avatar");
    } else if (step === "avatar") {
      setStep("confirm");
    }
  };

  const handlePrevious = () => {
    if (step === "confirm") {
      setStep("avatar");
    } else if (step === "avatar") {
      setStep("bio");
    }
  };

  const handleSubmit = async () => {
    const valid = await form.trigger();
    if (valid) {
      completeOnboardingMutation.mutate(form.getValues());
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Seller Profile</DialogTitle>
        </DialogHeader>

        <Tabs value={step} onValueChange={() => {}} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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

          {/* Step 1: Bio */}
          <TabsContent value="bio" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Tell us about you and your business.
            </div>

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
                        rows={4}
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
          <TabsContent value="avatar" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose or upload an avatar.
            </div>

            {/* Selected avatar preview */}
            <div className="flex justify-center">
              <img
                src={selectedAvatarUrl}
                alt="Selected avatar"
                className="h-32 w-32 rounded-full border-4 border-primary/20 shadow-lg"
              />
            </div>

            {/* Grid avatar selector */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Select or upload an avatar:</p>
              <div className="grid grid-cols-4 gap-3">
                {/* Upload custom button */}
                <label className="flex flex-col items-center gap-1 cursor-pointer group">
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border group-hover:border-primary/60 bg-muted group-hover:bg-muted/80 transition flex items-center justify-center flex-col">
                    <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
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
                {PRESET_AVATARS.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAvatarUrl(url)}
                    className={`h-20 w-20 rounded-lg border-2 overflow-hidden transition ${
                      selectedAvatarUrl === url
                        ? "border-primary ring-2 ring-primary ring-offset-1 shadow-md"
                        : "border-border hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Avatar ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
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
          <TabsContent value="confirm" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Here's a preview of your seller profile:
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex justify-center">
                <img
                  src={selectedAvatarUrl}
                  alt="Your avatar"
                  className="h-20 w-20 rounded-full border-2 border-border"
                />
              </div>

              <div className="text-center">
                <p className="font-semibold">{form.watch("displayName")}</p>
                <p className="text-sm text-muted-foreground">Seller Profile</p>
              </div>

              {form.watch("bio") && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground italic">
                    {form.watch("bio")}
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              You can change these anytime in your profile settings.
            </p>
          </TabsContent>
        </Tabs>

        {/* Navigation buttons */}
        <div className="flex gap-2 justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === "bio" || completeOnboardingMutation.isPending}
          >
            Back
          </Button>

          {step === "confirm" ? (
            <Button
              onClick={handleSubmit}
              disabled={completeOnboardingMutation.isPending}
            >
              {completeOnboardingMutation.isPending ? "Saving..." : "Complete"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={completeOnboardingMutation.isPending}
            >
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
