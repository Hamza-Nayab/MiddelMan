import type { User } from "./user.types";

export type VerificationMethod = "none" | "ig_bio_code" | "whatsapp_otp" | "manual";

export type ProfileTheme = "light" | "dark" | "gradient";
export type GradientPreset = "default" | "ocean" | "sunset" | "forest" | "berry";

export type Profile = {
  userId: number;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  contactEmail: string | null;
  whatsappNumber: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  isVerified: boolean;
  verificationMethod: VerificationMethod;
  theme: ProfileTheme;
  backgroundPreset: string | null;
  gradientPreset: string | null;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Link = {
  id: number;
  userId: number;
  icon?: string | null;
  title: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MeResponse = {
  user: User | null;
  profile: Profile | null;
};

export type SearchSuggestion = {
  username: string;
  displayName: string;
};

export type SearchResult = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  avgRating: number;
  totalReviews: number;
};

export type SearchResponse = {
  results: SearchResult[];
  meta: {
    nextOffset: number | null;
    hasMore: boolean;
  };
};
