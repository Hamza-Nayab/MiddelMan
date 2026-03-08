import { memo } from "react";
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
import { avatarOptions } from "@/lib/graphics";
import PhoneInput from "react-phone-number-input";
import { User } from "lucide-react";
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
                        const isSelected = field.value === option.id || isCustomValue;
                        const customPreview =
                          customAvatarPreview || (isCustomValue ? field.value : option.url);
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
                              src={option.id === "custom" ? customPreview : option.url}
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

                      const inputElement = event.currentTarget;

                      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                        toast({
                          title: "Unsupported format",
                          description: "Use JPG, PNG, or WEBP.",
                          variant: "destructive",
                        });
                        inputElement.value = "";
                        return;
                      }

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
                        const compressedFile = await compressAvatar(file);
                        const { avatarUrl } = await api.uploadAvatar(compressedFile);
                        setCustomAvatarPreview(avatarUrl);
                        field.onChange(avatarUrl);

                        toast({
                          title: "Avatar uploaded",
                          description: "Your avatar has been updated successfully.",
                        });
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Upload failed";
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
                    <p className="text-xs text-muted-foreground">Uploading avatar...</p>
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
                                <WhatsAppIcon className="h-4 w-4" />
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
