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

export const getAvatarUrl = (
  value?: string | null,
  fallbackSeed?: string | number,
) => {
  if (!value) {
    return generateRandomFallbackAvatar(fallbackSeed ?? RANDOM_FALLBACK_SEED);
  }

  // 1. Check if it's a preset avatar ID (e.g. "avatar-15") or contains a preset avatar pattern in the URL
  const presetMatch = value.match(/avatar-(\d+)/i);
  if (presetMatch) {
    const avatarId = `avatar-${parseInt(presetMatch[1], 10)}`;
    const match = avatarOptions.find((option) => option.id === avatarId);
    if (match) return match.url;
  }

  // 2. Reject any localhost, private IP, or invalid origin URLs to prevent Chrome Private Network Access alerts
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i.test(value)) {
    return generateRandomFallbackAvatar(fallbackSeed ?? RANDOM_FALLBACK_SEED);
  }

  // 3. Direct match with preset avatar options
  const match = avatarOptions.find(
    (option) => option.id === value || option.url === value,
  );
  if (match) return match.url;

  // 4. Data URIs and valid HTTPS/HTTP remote URLs (e.g. Cloudflare R2, DiceBear)
  if (value.startsWith("data:") || value.startsWith("http")) {
    return value;
  }

  return generateRandomFallbackAvatar(fallbackSeed ?? RANDOM_FALLBACK_SEED);
};

export const getAvatarId = (value?: string | null) => {
  if (!value) return avatarOptions[0].id;

  const presetMatch = value.match(/avatar-(\d+)/i);
  if (presetMatch) {
    const avatarId = `avatar-${parseInt(presetMatch[1], 10)}`;
    const match = avatarOptions.find((option) => option.id === avatarId);
    if (match) return match.id;
  }

  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value)) {
    return avatarOptions[0].id;
  }

  if (value.startsWith("data:") || value.startsWith("http")) return "custom";

  const match = avatarOptions.find(
    (option) => option.id === value || option.url === value,
  );
  return match?.id || avatarOptions[0].id;
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
