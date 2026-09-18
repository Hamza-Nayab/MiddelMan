import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { ProfilePreviewPhone } from "./ProfilePreviewPhone";
import type { ComponentProps } from "react";

type ProfilePreviewProps = ComponentProps<typeof ProfilePreviewPhone>;

type LiveProfilePreviewPhoneProps = Omit<
  ProfilePreviewProps,
  | "displayName"
  | "bio"
  | "avatarValue"
  | "phoneNumber"
  | "whatsappNumber"
  | "countryCode"
  | "contactEmail"
> & {
  control: Control<any>;
  fallbackProfile?: {
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
    countryCode?: string | null;
    contactEmail?: string | null;
  } | null;
  customAvatarPreview?: string | null;
};

export const LiveProfilePreviewPhone = memo(function LiveProfilePreviewPhone({
  control,
  fallbackProfile,
  customAvatarPreview,
  username,
  ...rest
}: LiveProfilePreviewPhoneProps) {
  const formValues = useWatch({
    control,
  });

  const displayName =
    formValues?.displayName || fallbackProfile?.displayName || username || "Seller";
  const bio =
    formValues?.bio !== undefined ? formValues.bio : (fallbackProfile?.bio ?? "");
  const avatarValue =
    customAvatarPreview || formValues?.avatarUrl || fallbackProfile?.avatarUrl || "avatar-1";
  const phoneNumber =
    formValues?.phoneNumber !== undefined
      ? formValues.phoneNumber
      : fallbackProfile?.phoneNumber;
  const whatsappNumber =
    formValues?.whatsappNumber !== undefined
      ? formValues.whatsappNumber
      : fallbackProfile?.whatsappNumber;
  const countryCode =
    formValues?.countryCode !== undefined
      ? formValues.countryCode
      : fallbackProfile?.countryCode;
  const contactEmail =
    formValues?.contactEmail !== undefined
      ? formValues.contactEmail
      : fallbackProfile?.contactEmail;

  return (
    <ProfilePreviewPhone
      {...rest}
      username={username}
      displayName={displayName}
      bio={bio}
      avatarValue={avatarValue}
      phoneNumber={phoneNumber}
      whatsappNumber={whatsappNumber}
      countryCode={countryCode}
      contactEmail={contactEmail}
    />
  );
});
