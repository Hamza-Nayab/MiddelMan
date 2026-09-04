import presetAvatar01 from "@/assets/preset-avatars/avatar-1.svg";
import presetAvatar02 from "@/assets/preset-avatars/avatar-2.svg";
import presetAvatar03 from "@/assets/preset-avatars/avatar-3.svg";
import presetAvatar04 from "@/assets/preset-avatars/avatar-4.svg";
import presetAvatar05 from "@/assets/preset-avatars/avatar-5.svg";
import presetAvatar06 from "@/assets/preset-avatars/avatar-6.svg";
import presetAvatar07 from "@/assets/preset-avatars/avatar-7.svg";
import presetAvatar08 from "@/assets/preset-avatars/avatar-8.svg";
import presetAvatar09 from "@/assets/preset-avatars/avatar-9.svg";
import presetAvatar10 from "@/assets/preset-avatars/avatar-10.svg";
import presetAvatar11 from "@/assets/preset-avatars/avatar-11.svg";
import presetAvatar12 from "@/assets/preset-avatars/avatar-12.svg";
import presetAvatar13 from "@/assets/preset-avatars/avatar-13.svg";
import presetAvatar14 from "@/assets/preset-avatars/avatar-14.svg";
import presetAvatar15 from "@/assets/preset-avatars/avatar-15.svg";
import { Globe } from "lucide-react";
import {
  SiFacebook,
  SiX,
  SiYoutube,
  SiTiktok,
  SiWhatsapp,
  SiSnapchat,
  SiPinterest,
  SiReddit,
  SiGithub,
  SiShopify,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";

export const avatarOptions = [
  { id: "avatar-1", label: "Avatar 1", url: presetAvatar01 },
  { id: "avatar-2", label: "Avatar 2", url: presetAvatar02 },
  { id: "avatar-3", label: "Avatar 3", url: presetAvatar03 },
  { id: "avatar-4", label: "Avatar 4", url: presetAvatar04 },
  { id: "avatar-5", label: "Avatar 5", url: presetAvatar05 },
  { id: "avatar-6", label: "Avatar 6", url: presetAvatar06 },
  { id: "avatar-7", label: "Avatar 7", url: presetAvatar07 },
  { id: "avatar-8", label: "Avatar 8", url: presetAvatar08 },
  { id: "avatar-9", label: "Avatar 9", url: presetAvatar09 },
  { id: "avatar-10", label: "Avatar 10", url: presetAvatar10 },
  { id: "avatar-11", label: "Avatar 11", url: presetAvatar11 },
  { id: "avatar-12", label: "Avatar 12", url: presetAvatar12 },
  { id: "avatar-13", label: "Avatar 13", url: presetAvatar13 },
  { id: "avatar-14", label: "Avatar 14", url: presetAvatar14 },
  { id: "avatar-15", label: "Avatar 15", url: presetAvatar15 },
  { id: "custom", label: "Custom", url: presetAvatar01 },
] as const;

const RANDOM_FALLBACK_SEED = Math.floor(Math.random() * 1_000_000_000);

/**
 * Generate a random fallback avatar URL using DiceBear API
 * Used when a profile doesn't have an avatar assigned
 */
export const generateRandomFallbackAvatar = (seed: string | number) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

export const isPresetAvatarId = (id?: string | null): boolean => {
  if (!id) return false;
  return /^avatar-(1[0-5]|[1-9])$/.test(id);
};

export const isCustomAvatar = (value?: string | null): boolean => {
  if (!value) return false;
  if (isPresetAvatarId(value)) return false;
  if (value === "custom" || value.includes("dicebear.com")) return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value)) return false;
  if (
    avatarOptions.some(
      (opt) => opt.id !== "custom" && (opt.url === value || opt.id === value),
    )
  ) {
    return false;
  }
  if (value.match(/avatar-(\d+)/i)) return false;
  return value.startsWith("http") || value.startsWith("data:");
};

export const getAvatarUrl = (
  value?: string | null,
  fallbackSeed?: string | number,
) => {
  if (!value || value === "custom") {
    return presetAvatar01;
  }

  // 1. Direct ID match for preset avatars (e.g. "avatar-1" to "avatar-15")
  if (/^avatar-(1[0-5]|[1-9])$/.test(value)) {
    const option = avatarOptions.find((opt) => opt.id === value);
    if (option) return option.url;
  }

  // 2. Check if it contains a preset avatar pattern in the URL (e.g. Vite build asset path)
  const presetMatch = value.match(/avatar-(\d+)/i);
  if (presetMatch) {
    const avatarId = `avatar-${parseInt(presetMatch[1], 10)}`;
    const match = avatarOptions.find((option) => option.id === avatarId);
    if (match) return match.url;
  }

  // 3. Reject any localhost, private IP, or dicebear fallback to use reliable presetAvatar01
  if (
    /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i.test(
      value,
    ) ||
    value.includes("dicebear.com")
  ) {
    return presetAvatar01;
  }

  // 4. Direct match with preset avatar options
  const match = avatarOptions.find(
    (option) =>
      (option.id === value || option.url === value) && option.id !== "custom",
  );
  if (match) return match.url;

  // 5. Genuine custom uploads (Cloudflare R2, valid remote URLs, data URIs)
  if (value.startsWith("data:") || value.startsWith("http")) {
    return value;
  }

  return presetAvatar01;
};

export const getAvatarId = (value?: string | null) => {
  if (!value || value === "custom") return avatarOptions[0].id;

  // 1. Direct match with preset avatar IDs (avatar-1 to avatar-15)
  if (/^avatar-(1[0-5]|[1-9])$/.test(value)) {
    return value;
  }

  // 2. Check if it contains avatar-(\d+) in the path or URL
  const presetMatch = value.match(/avatar-(\d+)/i);
  if (presetMatch) {
    const avatarId = `avatar-${parseInt(presetMatch[1], 10)}`;
    const match = avatarOptions.find((option) => option.id === avatarId);
    if (match) return match.id;
  }

  // 3. Reject localhost, private IP, dicebear
  if (
    /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value) ||
    value.includes("dicebear.com")
  ) {
    return avatarOptions[0].id;
  }

  // 4. Direct match with preset avatar options URLs
  const match = avatarOptions.find(
    (option) => option.url === value && option.id !== "custom",
  );
  if (match) return match.id;

  // 5. Genuine custom upload URL (R2 or data URI) -> return the URL itself
  if (value.startsWith("data:") || value.startsWith("http")) {
    return value;
  }

  return avatarOptions[0].id;
};

export const platformOptions = [
  { key: "website", label: "Website", icon: Globe, urlHint: "https://" },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: FaLinkedin,
    urlHint: "https://linkedin.com/in/",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: SiFacebook,
    urlHint: "https://facebook.com/",
  },
  { key: "x", label: "X", icon: SiX, urlHint: "https://x.com/" },
  {
    key: "reddit",
    label: "Reddit",
    icon: SiReddit,
    urlHint: "https://reddit.com/u/",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: SiYoutube,
    urlHint: "https://youtube.com/",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: SiTiktok,
    urlHint: "https://tiktok.com/@",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: SiWhatsapp,
    urlHint: "https://wa.me/",
  },
  {
    key: "snapchat",
    label: "Snapchat",
    icon: SiSnapchat,
    urlHint: "https://snapchat.com/add/",
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: SiPinterest,
    urlHint: "https://pinterest.com/",
  },
  {
    key: "github",
    label: "GitHub",
    icon: SiGithub,
    urlHint: "https://github.com/",
  },
  {
    key: "shopify",
    label: "Shopify",
    icon: SiShopify,
    urlHint: "https://",
  },
] as const;

export type PlatformKey = (typeof platformOptions)[number]["key"];

export const platformIconMap = platformOptions.reduce(
  (acc, platform) => {
    acc[platform.key] = platform.icon;
    return acc;
  },
  {} as Record<PlatformKey, React.ComponentType<any>>,
);
