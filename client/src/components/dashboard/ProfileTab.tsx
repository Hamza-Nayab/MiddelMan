import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import PhoneInput from "react-phone-number-input";
import {
  avatarOptions,
  isCustomAvatar,
  getAvatarId,
  getAvatarUrl,
} from "@/lib/graphics";
import {
  User,
  UploadCloud,
  Upload,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { MutableRefObject } from "react";

type ProfileTabProps = {
  user: any;
  profileForm: any;
  updateProfileMutation: any;
  isUsernameDialogOpen: boolean;
  setIsUsernameDialogOpen: (open: boolean) => void;
  usernameForm: any;
  changeUsernameMutation: any;
  usernameInput: string;
  usernameAvailability: any;
  remainingUsernameChanges: number;
  usernameCooldownActive: boolean;
  nextUsernameChangeAt: Date | null;
  daysUntilUsernameChange: number;
  canChangeUsername: boolean;
  avatarInputRef: MutableRefObject<HTMLInputElement | null>;
  customAvatarPreview: string | null;
  setCustomAvatarPreview: (value: string | null) => void;
  isAvatarUploading: boolean;
  setIsAvatarUploading: (value: boolean) => void;
  compressAvatar: (file: File) => Promise<File>;
  api: any;
  toast: (value: any) => void;
  isWhatsAppSameAsPhone: boolean;
  setIsWhatsAppSameAsPhone: (value: boolean) => void;
  watchedCountryCode: string | null;
  watchedPhoneNumber: string | null;
  whatsappPreviewUrl: string | null;
  WhatsAppIcon: any;
};

export const ProfileTab = memo(function ProfileTab({
  user,
  profileForm,
  updateProfileMutation,
  isUsernameDialogOpen,
  setIsUsernameDialogOpen,
  usernameForm,
  changeUsernameMutation,
  usernameInput,
  usernameAvailability,
  remainingUsernameChanges,
  usernameCooldownActive,
  nextUsernameChangeAt,
  daysUntilUsernameChange,
  canChangeUsername,
  avatarInputRef,
  customAvatarPreview,
  setCustomAvatarPreview,
  isAvatarUploading,
  setIsAvatarUploading,
  compressAvatar,
  api,
  toast,
  isWhatsAppSameAsPhone,
  setIsWhatsAppSameAsPhone,
  watchedCountryCode,
  watchedPhoneNumber,
  whatsappPreviewUrl,
  WhatsAppIcon,
}: ProfileTabProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleAvatarFile = async (file?: File | null) => {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Unsupported format",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAvatarUploading(true);
      const compressedFile = await compressAvatar(file);
      const { avatarUrl } = await api.uploadAvatar(compressedFile);
      setCustomAvatarPreview(avatarUrl);
      profileForm.setValue("avatarUrl", avatarUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      toast({
        title: "Custom Avatar Uploaded",
        description: "Your logo has been uploaded to your Cloudflare R2 bucket.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  return (
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
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
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
                      onSubmit={usernameForm.handleSubmit((values: any) =>
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
                            {usernameInput && usernameInput === (user.username ?? "") && (
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
                                <p className="text-xs text-amber-600">Username is taken.</p>
                                {usernameAvailability.suggestions.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {usernameAvailability.suggestions.map((suggestion: string) => (
                                      <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() =>
                                          usernameForm.setValue("username", suggestion)
                                        }
                                        className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
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
                        <p>Remaining changes: {remainingUsernameChanges} / 3</p>
                        {usernameCooldownActive && nextUsernameChangeAt && (
                          <p className="text-amber-600">
                            Next change in {daysUntilUsernameChange} day(s)
                            (available {nextUsernameChangeAt.toDateString()})
                          </p>
                        )}
                        {remainingUsernameChanges === 0 && (
                          <p className="text-destructive">
                            You have reached the lifetime limit of 3 changes.
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
                        {changeUsernameMutation.isPending ? "Updating..." : "Update username"}
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        Max 3 lifetime changes. 30-day cooldown between changes. Contact
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
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit((values: any) =>
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
              render={({ field }) => {
                const hasCustomAvatar = isCustomAvatar(field.value);
                const currentAvatarId = !hasCustomAvatar ? getAvatarId(field.value) : null;
                const activeCustomUrl = customAvatarPreview || (hasCustomAvatar ? field.value : null);

                return (
                  <FormItem className="space-y-4">
                    <div>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        Profile Avatar & Logo
                      </FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Upload your custom store logo to our secure Cloudflare R2 bucket or select an official character avatar.
                      </p>
                    </div>

                    {/* Dedicated Custom Avatar Bucket Card */}
                    <div className="rounded-2xl border border-border/80 bg-slate-50/50 dark:bg-zinc-900/50 p-4 sm:p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <UploadCloud className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground">
                                Custom Logo & Avatar Bucket
                              </h4>
                              {hasCustomAvatar && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Secure Cloudflare R2 storage • High-speed CDN delivery
                            </p>
                          </div>
                        </div>

                        {hasCustomAvatar && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isAvatarUploading}
                              onClick={() => avatarInputRef.current?.click()}
                              className="h-8 px-3 text-xs gap-1.5"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Replace
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isAvatarUploading}
                              onClick={() => {
                                setCustomAvatarPreview(null);
                                field.onChange("avatar-1");
                                toast({
                                  title: "Custom avatar removed",
                                  description: "Switched to default character avatar.",
                                });
                              }}
                              className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Dropzone Container or Active Preview Card */}
                      {hasCustomAvatar && activeCustomUrl ? (
                        <div className="flex items-center gap-4 p-3.5 rounded-xl border border-primary/20 bg-background/90 shadow-2xs">
                          <div className="relative h-16 w-16 shrink-0 rounded-xl border-2 border-primary/40 bg-muted/40 shadow-xs overflow-hidden flex items-center justify-center">
                            <img
                              src={activeCustomUrl}
                              alt="Custom Avatar Preview"
                              className="h-full w-full object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              Custom Brand Logo Active
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              This image is visible to buyers across your trust profile, store badges, and search listings.
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> CDN Cached & WebP Optimized
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleAvatarFile(file);
                          }}
                          onClick={() => {
                            if (!isAvatarUploading) avatarInputRef.current?.click();
                          }}
                          className={cn(
                            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 bg-background/50",
                            isDragging
                              ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]"
                              : "border-border hover:border-primary/60 hover:bg-muted/40",
                            isAvatarUploading && "pointer-events-none opacity-80",
                          )}
                        >
                          {isAvatarUploading ? (
                            <div className="flex flex-col items-center justify-center py-2 space-y-2">
                              <Loader2 className="h-7 w-7 animate-spin text-primary" />
                              <p className="text-sm font-semibold text-foreground">
                                Uploading to Cloudflare R2 bucket...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Compressing and optimizing image to WebP
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UploadCloud className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Drag & drop your store logo here, or{" "}
                                  <span className="text-primary underline font-bold">browse</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  PNG, JPG, or WebP up to 5MB • Automatically scaled & converted to WebP
                                </p>
                              </div>
                              <div className="flex items-center gap-2 pt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                                  <Sparkles className="h-3 w-3 text-amber-500" />
                                  Cloudflare R2 Bucket
                                </span>
                                <span>•</span>
                                <span>High-resolution CDN Delivery</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleAvatarFile(file);
                      }}
                    />

                    {/* Preset Avatars Section */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Or Choose From Preset Character Avatars
                        </span>
                        <span className="text-xs text-muted-foreground">
                          15 options
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {avatarOptions
                          .filter((option) => option.id !== "custom")
                          .map((option) => {
                            const isSelected =
                              !hasCustomAvatar && currentAvatarId === option.id;

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  setCustomAvatarPreview(null);
                                  field.onChange(option.id);
                                }}
                                className={cn(
                                  "group relative flex flex-col items-center rounded-xl border p-2.5 transition-all duration-150 text-center hover:-translate-y-0.5",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs"
                                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </div>
                                )}
                                <img
                                  src={option.url}
                                  alt={option.label}
                                  className="h-14 w-14 object-contain transition-transform duration-150 group-hover:scale-105"
                                />
                                <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seller@email.com" {...field} />
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
                        defaultCountry={(watchedCountryCode as any) || "US"}
                        country={(watchedCountryCode as any) || "US"}
                        value={field.value || ""}
                        onChange={(value) => field.onChange(value ?? "")}
                        onCountryChange={(country) =>
                          profileForm.setValue("countryCode", country ?? "US")
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
              render={({ field }) => <input type="hidden" {...field} />}
            />
            <FormField
              control={profileForm.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>WhatsApp Number</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Same as phone</span>
                      <Switch
                        checked={isWhatsAppSameAsPhone}
                        onCheckedChange={(checked) => {
                          setIsWhatsAppSameAsPhone(checked);
                          if (checked) {
                            profileForm.setValue("whatsappNumber", watchedPhoneNumber || "");
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
                          defaultCountry={(watchedCountryCode as any) || "US"}
                          country={(watchedCountryCode as any) || "US"}
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value ?? "")}
                          onCountryChange={(country) =>
                            profileForm.setValue("countryCode", country ?? "US")
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
                                  window.open(whatsappPreviewUrl, "_blank");
                                }}
                                aria-label="Open WhatsApp preview"
                              >
                                <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!whatsappPreviewUrl && (
                            <TooltipContent>Enter a valid WhatsApp number</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});
