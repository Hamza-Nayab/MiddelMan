export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: ApiErrorPayload };

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.ok) {
    const errorPayload = !json.ok ? json.error : undefined;
    throw new ApiError(
      errorPayload?.message || "Request failed",
      res.status,
      errorPayload?.code,
      errorPayload?.details,
    );
  }

  return json.data;
}

export type User = {
  id: number;
  username: string | null;
  email?: string | null;
  role: "buyer" | "seller" | "admin";
  lastUsernameChangedAt?: string | null;
  usernameChangeCount?: number;
  createdAt: string;
  isMasterAdmin?: boolean;
};

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
  verificationMethod: "none" | "ig_bio_code" | "whatsapp_otp" | "manual";
  theme: "light" | "dark" | "gradient";
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

export type PublicProfileResponse = {
  user: User;
  profile: Profile;
  stats: { avgRating: number; totalReviews: number };
};

export type Review = {
  id: number;
  sellerId: number;
  reviewerUserId?: number | null;
  authorName: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  createdAt: string;
};

export type ReviewsResponse = {
  reviews: Review[];
  stats: {
    avgRating: number;
    totalReviews: number;
    breakdown?: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  nextCursor?: number;
};

export type PublicProfileBundleResponse = {
  user: User;
  profile: Profile;
  links: Link[];
  reviews: Review[];
  stats: { avgRating: number; totalReviews: number };
  isOwner: boolean;
};

export type AnalyticsDay = {
  day: string;
  views: number;
  clicks: number;
};

export type AnalyticsResponse = {
  days: AnalyticsDay[];
};

export type RegisterPayload = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "buyer" | "seller";
  username?: string;
  avatarUrl?: string;
};

export type UsernameCheckResponse = {
  available: boolean;
  suggestions: string[];
};

export type OnboardingPayload = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  username?: string;
  role?: "buyer" | "seller";
};

export type LoginPayload = {
  loginType: "buyer" | "seller";
  email?: string;
  usernameOrEmail?: string;
  password: string;
};

export type ProfileUpdatePayload = Partial<{
  displayName: string;
  bio: string;
  avatarUrl: string;
  contactEmail: string;
  whatsappNumber: string;
  phoneNumber: string;
  countryCode: string;
  theme: "light" | "dark" | "gradient";
}>;

export type LinkCreatePayload = {
  icon?: string;
  title: string;
  url: string;
};

export type LinkUpdatePayload = Partial<{
  icon: string;
  title: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
}>;

export type ReviewCreatePayload = {
  rating: number;
  comment: string;
};

export type ReviewUpdatePayload = {
  rating: number;
  comment: string;
};

export type GivenReview = Review & {
  seller: {
    id: number;
    username: string | null;
    displayName: string | null;
  };
};

export type GivenReviewsResponse = {
  reviews: GivenReview[];
};

export type AdminReviewItem = Review & {
  sellerUsername: string | null;
  sellerDisplayName: string | null;
};

export type AdminReviewsResponse = {
  items: AdminReviewItem[];
  nextCursor?: number;
};

export type ReviewDispute = {
  id: number;
  reviewId: number;
  sellerId: number;
  status: "open" | "resolved_valid" | "resolved_rejected";
  reason: string;
  message?: string | null;
  evidenceUrl?: string | null;
  evidenceMime?: string | null;
  createdAt: string;
};

export type ReviewDisputeCreatePayload = {
  reason: string;
  message?: string;
};

export type AdminUser = {
  id: number;
  username: string | null;
  email: string | null;
  role: "buyer" | "seller" | "admin";
  isDisabled: boolean;
  disabledReason: string | null;
  createdAt: string;
  isMasterAdmin: boolean;
};

export type AdminUsersResponse = {
  items: AdminUser[];
  nextCursor: number | null;
};

export type Admin = {
  id: number;
  username: string;
  email: string | null;
  role: "admin";
  isMasterAdmin: boolean;
  isDisabled: boolean;
  createdAt: string;
};

export type AdminsResponse = {
  admins: Admin[];
};

export type AdminDisputeItem = {
  id: number;
  reviewId: number;
  sellerId: number;
  status: "open" | "resolved_valid" | "resolved_rejected";
  reason: string;
  message?: string | null;
  evidenceUrl?: string | null;
  evidenceMime?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedByAdminId?: number | null;
  resolutionNote?: string | null;
  review?: {
    id: number;
    rating: number;
    comment: string;
    authorName: string;
    isHidden: boolean;
    createdAt: string;
  };
  seller?: {
    id: number;
    username?: string | null;
    displayName?: string | null;
  };
};

export type AdminDisputesResponse = {
  items: AdminDisputeItem[];
  nextCursor?: number;
};

export type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  items: Notification[];
  unreadCount: number;
  nextCursor?: number | null;
};

export type AdminSellerDetail = {
  user: AdminUser;
  profile: Profile;
  links: Link[];
  stats: { avgRating: number; totalReviews: number };
  reviewsReceived: Array<{
    id: number;
    rating: number;
    comment: string;
    authorName: string;
    isHidden: boolean;
    createdAt: string;
    reviewerUserId?: number | null;
  }>;
  reviewsGiven: Array<{
    id: number;
    rating: number;
    comment: string;
    authorName: string;
    isHidden: boolean;
    createdAt: string;
    sellerId: number;
  }>;
  recentDisputes: Array<{
    id: number;
    reviewId: number;
    status: "open" | "resolved_valid" | "resolved_rejected";
    reason: string;
    message?: string | null;
    evidenceUrl?: string | null;
    createdAt: string;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
  }>;
};

export type AnalyticsOverview = {
  days: number;
  totalViews: number;
  totalClicks: number;
  topSellersByViews: Array<{
    userId: number;
    username: string | null;
    displayName: string;
    views: number;
  }>;
  topSellersByClicks: Array<{
    userId: number;
    username: string | null;
    displayName: string;
    clicks: number;
  }>;
};

export type SearchSuggestion = {
  username: string;
  displayName: string;
};

export const api = {
  register: (payload: RegisterPayload) =>
    request<{ user: User }>("POST", "/api/auth/register", payload),
  login: (payload: LoginPayload) =>
    request<{ user: User }>("POST", "/api/auth/login", payload),
  logout: () => request<{ loggedOut: boolean }>("POST", "/api/auth/logout"),
  getMe: () => request<MeResponse>("GET", "/api/me"),
  updateRole: (role: "buyer" | "seller") =>
    request<{ user: User }>("PATCH", "/api/me/role", { role }),
  getAnalytics: (days = 7) =>
    request<AnalyticsResponse>("GET", `/api/me/analytics?days=${days}`),
  checkUsername: (username: string) =>
    request<UsernameCheckResponse>(
      "GET",
      `/api/username/check?username=${encodeURIComponent(username)}`,
    ),
  changeUsername: (username: string) =>
    request<{ user: User }>("PATCH", "/api/me/username", { username }),
  completeOnboarding: (payload: OnboardingPayload) =>
    request<{ user: User; profile: Profile }>(
      "PATCH",
      "/api/me/onboarding",
      payload,
    ),
  updateProfile: (payload: ProfileUpdatePayload) =>
    request<{ profile: Profile }>("PATCH", "/api/me/profile", payload),
  getLinks: () => request<{ links: Link[] }>("GET", "/api/me/links"),
  addLink: (payload: LinkCreatePayload) =>
    request<{ link: Link }>("POST", "/api/me/links", payload),
  updateLink: (id: number, payload: LinkUpdatePayload) =>
    request<{ link: Link }>("PATCH", `/api/me/links/${id}`, payload),
  deleteLink: (id: number) =>
    request<{ deleted: boolean }>("DELETE", `/api/me/links/${id}`),
  reorderLinks: (orderedIds: number[]) =>
    request<{ updated: boolean }>("PATCH", "/api/me/links/reorder", {
      orderedIds,
    }),
  getPublicProfile: (username: string, options?: { track?: boolean }) =>
    request<PublicProfileResponse>(
      "GET",
      `/api/profile/${encodeURIComponent(username)}${
        options?.track ? "?track=1" : ""
      }`,
    ),
  getPublicProfileBundle: (username: string, options?: { track?: boolean }) =>
    request<PublicProfileBundleResponse>(
      "GET",
      `/api/profile/${encodeURIComponent(username)}/bundle${
        options?.track ? "?track=1" : ""
      }`,
    ),
  getPublicLinks: (userId: number) =>
    request<{ links: Link[] }>("GET", `/api/profile/${userId}/links`),
  trackProfileClick: (userId: number) =>
    request<{ recorded: boolean }>("POST", `/api/profile/${userId}/click`),
  getPublicReviews: (
    userId: number,
    options?: { rating?: string; cursor?: number; limit?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.rating) params.append("rating", options.rating);
    if (options?.cursor) params.append("cursor", String(options.cursor));
    if (options?.limit) params.append("limit", String(options.limit));
    const queryString = params.toString();
    return request<ReviewsResponse>(
      "GET",
      `/api/profile/${userId}/reviews${queryString ? `?${queryString}` : ""}`,
    );
  },
  createReview: (userId: number, payload: ReviewCreatePayload) =>
    request<{ review: Review }>(
      "POST",
      `/api/profile/${userId}/reviews`,
      payload,
    ),
  getOwnerReviews: () => request<ReviewsResponse>("GET", "/api/me/reviews"),
  getGivenReviews: () =>
    request<GivenReviewsResponse>("GET", "/api/me/reviews/given"),
  updateGivenReview: (id: number, payload: ReviewUpdatePayload) =>
    request<{ review: Review }>(
      "PATCH",
      `/api/me/reviews/given/${id}`,
      payload,
    ),
  createReviewDispute: (
    reviewId: number,
    payload: ReviewDisputeCreatePayload,
  ) =>
    request<{ dispute: ReviewDispute }>(
      "POST",
      `/api/me/reviews/${reviewId}/dispute`,
      payload,
    ),
  uploadDisputeEvidence: async (reviewId: number, file: File) => {
    const formData = new FormData();
    formData.append("evidence", file);

    const res = await fetch(`/api/me/reviews/${reviewId}/dispute/evidence`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const json = (await res.json()) as ApiResponse<{
      dispute: ReviewDispute;
      evidenceUrl: string;
    }>;

    if (!res.ok || !json.ok) {
      const errorPayload = !json.ok ? json.error : undefined;
      throw new ApiError(
        errorPayload?.message || "Evidence upload failed",
        res.status,
        errorPayload?.code,
        errorPayload?.details,
      );
    }

    return json.data;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/me/avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const json = (await res.json()) as ApiResponse<{ avatarUrl: string }>;

    if (!res.ok || !json.ok) {
      const errorPayload = !json.ok ? json.error : undefined;
      throw new ApiError(
        errorPayload?.message || "Avatar upload failed",
        res.status,
        errorPayload?.code,
        errorPayload?.details,
      );
    }

    return json.data;
  },
  search: (query: string, options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    const suffix = params.toString();
    return request<{
      results: Array<{
        user: User;
        profile: Profile;
        stats: ReviewsResponse["stats"];
      }>;
      meta: {
        nextOffset: number | null;
        hasMore: boolean;
      };
    }>("GET", `/api/search?${suffix}`);
  },
  searchSuggest: (query: string) =>
    request<{ suggestions: SearchSuggestion[] }>(
      "GET",
      `/api/search/suggest?q=${encodeURIComponent(query)}`,
    ),
  adminGetReviews: (params?: {
    sellerId?: number;
    hidden?: boolean;
    rating?: number;
    limit?: number;
    cursor?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.sellerId !== undefined) {
      query.set("sellerId", String(params.sellerId));
    }
    if (params?.hidden !== undefined) {
      query.set("hidden", String(params.hidden));
    }
    if (params?.rating !== undefined) {
      query.set("rating", String(params.rating));
    }
    if (params?.limit !== undefined) {
      query.set("limit", String(params.limit));
    }
    if (params?.cursor !== undefined) {
      query.set("cursor", String(params.cursor));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<AdminReviewsResponse>("GET", `/api/admin/reviews${suffix}`);
  },
  adminHideReview: (id: number, isHidden: boolean, reason?: string) =>
    request<{ review: Review }>("PATCH", `/api/admin/reviews/${id}/hide`, {
      isHidden,
      reason,
    }),
  adminGetUsers: (params?: {
    q?: string;
    role?: string;
    disabled?: boolean;
    limit?: number;
    cursor?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.q) {
      query.set("q", params.q);
    }
    if (params?.role) {
      query.set("role", params.role);
    }
    if (params?.disabled !== undefined) {
      query.set("disabled", String(params.disabled));
    }
    if (params?.limit !== undefined) {
      query.set("limit", String(params.limit));
    }
    if (params?.cursor !== undefined) {
      query.set("cursor", String(params.cursor));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<AdminUsersResponse>("GET", `/api/admin/users${suffix}`);
  },
  adminDisableUser: (id: number, reason?: string) =>
    request<{ user: AdminUser }>("PATCH", `/api/admin/users/${id}/disable`, {
      reason,
    }),
  adminEnableUser: (id: number) =>
    request<{ user: AdminUser }>("PATCH", `/api/admin/users/${id}/enable`, {}),
  adminSetUserRole: (id: number, role: "admin" | "buyer" | "seller") =>
    request<{ user: User }>("PATCH", `/api/admin/users/${id}/role`, { role }),
  adminGetDisputes: (params?: {
    status?: string;
    sellerId?: number;
    limit?: number;
    cursor?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.sellerId !== undefined) {
      query.set("sellerId", String(params.sellerId));
    }
    if (params?.limit !== undefined) {
      query.set("limit", String(params.limit));
    }
    if (params?.cursor !== undefined) {
      query.set("cursor", String(params.cursor));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<AdminDisputesResponse>(
      "GET",
      `/api/admin/disputes${suffix}`,
    );
  },
  adminResolveDispute: (
    id: number,
    payload: {
      outcome: "valid" | "rejected";
      resolutionNote?: string;
      hideReview?: boolean;
    },
  ) =>
    request<{ dispute: AdminDisputeItem }>(
      "PATCH",
      `/api/admin/disputes/${id}/resolve`,
      payload,
    ),
  adminDeleteDisputeEvidence: (id: number) =>
    request<{ dispute: AdminDisputeItem }>(
      "DELETE",
      `/api/admin/disputes/${id}/evidence`,
    ),
  adminGetSellerDetail: (sellerId: number) =>
    request<AdminSellerDetail>("GET", `/api/admin/sellers/${sellerId}`),
  adminGetAnalyticsOverview: (days?: 7 | 30) =>
    request<AnalyticsOverview>(
      "GET",
      `/api/admin/analytics/overview${days ? `?days=${days}` : ""}`,
    ),

  // Admin Management
  adminGetAdmins: () => request<AdminsResponse>("GET", "/api/admin/admins"),
  adminCreateAdmin: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) =>
    request<{
      admin: {
        id: number;
        username: string;
        email: string;
        role: "admin";
        isMasterAdmin: boolean;
        createdAt: string;
      };
    }>("POST", "/api/admin/admins", data),

  // Notifications
  getNotifications: (params?: {
    limit?: number;
    cursor?: number;
    unreadOnly?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) {
      query.set("limit", String(params.limit));
    }
    if (params?.cursor !== undefined) {
      query.set("cursor", String(params.cursor));
    }
    if (params?.unreadOnly) {
      query.set("unreadOnly", "true");
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<NotificationsResponse>(
      "GET",
      `/api/me/notifications${suffix}`,
    );
  },
  markNotificationRead: (id: number) =>
    request<{ notification: Notification }>(
      "PATCH",
      `/api/me/notifications/${id}/read`,
    ),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>(
      "POST",
      "/api/me/notifications/mark-all-read",
    ),
};

// Global error handler hook for catching ACCOUNT_DISABLED errors
export function useGlobalErrorHandler() {
  // This is a no-op right now, but individual pages should catch
  // the ACCOUNT_DISABLED error using error boundaries or error handlers
  // The error will be thrown from api.ts as ApiError with code='ACCOUNT_DISABLED'
}
