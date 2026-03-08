export type UserRole = "buyer" | "seller" | "admin";

export type User = {
  id: number;
  username: string | null;
  email?: string | null;
  role: UserRole;
  lastUsernameChangedAt?: string | null;
  usernameChangeCount?: number;
  createdAt: string;
  isMasterAdmin?: boolean;
};

export type UsernameCheckResponse = {
  available: boolean;
  suggestions: string[];
};
