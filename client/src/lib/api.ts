import type {
  AnalyticsDay as SharedAnalyticsDay,
  AnalyticsOverview as SharedAnalyticsOverview,
  AnalyticsResponse as SharedAnalyticsResponse,
  DisputeStatus,
  Link as SharedLink,
  MeResponse as SharedMeResponse,
  Profile as SharedProfile,
  ProfileTheme,
  Review as SharedReview,
  ReviewDispute as SharedReviewDispute,
  ReviewStats,
  SearchResponse,
  SearchResult as SharedSearchResult,
  SearchSuggestion as SharedSearchSuggestion,
  User as SharedUser,
  UserRole,
  UsernameCheckResponse as SharedUsernameCheckResponse,
} from "@shared/types";

export type {
  DisputeStatus,
  ProfileTheme,
  ReviewStats,
  SearchResponse,
  UserRole,
};

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
  options?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal: options?.signal,
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

async function requestForm<T>(
  method: string,
  url: string,
  formData: FormData,
  options?: { signal?: AbortSignal; fallbackMessage?: string },
): Promise<T> {
  const res = await fetch(url, {
    method,
    body: formData,
    credentials: "include",
    signal: options?.signal,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.ok) {
    const errorPayload = !json.ok ? json.error : undefined;
    throw new ApiError(
      errorPayload?.message || options?.fallbackMessage || "Request failed",
      res.status,
      errorPayload?.code,
      errorPayload?.details,
    );
  }

  return json.data;
}

export type User = SharedUser;

export type Profile = SharedProfile;

export type Link = SharedLink;

export type MeResponse = SharedMeResponse;

export type Review = SharedReview;

export type ReviewsResponse = {
  reviews: Review[];
  stats: ReviewStats;
  nextCursor?: number;
};

export type OwnerDashboardReview = {
  reviewId: number;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  disputeStatus: string | null;
};

export type OwnerReviewsResponse = {
  reviews: OwnerDashboardReview[];
  stats: {
    avgRating: number;
    totalReviews: number;
  };
  meta: {
    hasMore: boolean;
    nextOffset: number | null;
  };
};

export type PublicProfileBundleResponse = {
  user: User;
  profile: Profile;
  links: Link[];
  reviews: Review[];
  stats: { avgRating: number; totalReviews: number };
  isOwner: boolean;
};

export type AnalyticsDay = SharedAnalyticsDay;

export type AnalyticsResponse = SharedAnalyticsResponse;

export type RegisterPayload = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "buyer" | "seller";
  username?: string;
  avatarUrl?: string;
};

export type UsernameCheckResponse = SharedUsernameCheckResponse;

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

export type GradientPreset = "default" | "ocean" | "sunset" | "forest" | "berry";

export type ProfileUpdatePayload = Partial<{
  displayName: string;
  bio: string;
  avatarUrl: string;
  contactEmail: string;
  whatsappNumber: string;
  phoneNumber: string;
  countryCode: string;
  theme: "light" | "dark";
  backgroundPreset: "gradient" | "antigravity" | "aurora" | "iridescence" | null;
  gradientPreset: GradientPreset | null;
  accentColor: string | null;
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

export type ReviewDispute = SharedReviewDispute;

export type ReviewDisputeCreatePayload = {
  reason: string;
  message?: string;
};

export type AdminUser = {
  id: number;
  username: string | null;
  email: string | null;
  role: UserRole;
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
  status: DisputeStatus;
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
    status: DisputeStatus;
    reason: string;
    message?: string | null;
    evidenceUrl?: string | null;
    createdAt: string;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
  }>;
};

export type AnalyticsOverview = SharedAnalyticsOverview;

export type SearchSuggestion = SharedSearchSuggestion;

export type SearchResult = SharedSearchResult;

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
  getPublicProfileBundle: (username: string, options?: { track?: boolean }) =>
    request<PublicProfileBundleResponse>(
      "GET",
      `/api/profile/${encodeURIComponent(username)}/bundle${
        options?.track ? "?track=1" : ""
      }`,
    ),
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
  getOwnerReviewsPage: (options?: {
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    const suffix = params.toString();
    return request<OwnerReviewsResponse>(
      "GET",
      `/api/me/reviews${suffix ? `?${suffix}` : ""}`,
      undefined,
      { signal: options?.signal },
    );
  },
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
    return requestForm<{
      dispute: ReviewDispute;
      evidenceUrl: string;
    }>("POST", `/api/me/reviews/${reviewId}/dispute/evidence`, formData, {
      fallbackMessage: "Evidence upload failed",
    });
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return requestForm<{ avatarUrl: string }>(
      "POST",
      "/api/me/avatar",
      formData,
      { fallbackMessage: "Avatar upload failed" },
    );
  },
  search: (
    query: string,
    options?: { limit?: number; offset?: number; signal?: AbortSignal },
  ) => {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }
    const suffix = params.toString();
    return request<SearchResponse>("GET", `/api/search?${suffix}`, undefined, {
      signal: options?.signal,
    });
  },
  searchSuggest: (query: string, options?: { signal?: AbortSignal }) =>
    request<{ suggestions: SearchSuggestion[] }>(
      "GET",
      `/api/search/suggest?q=${encodeURIComponent(query)}`,
      undefined,
      { signal: options?.signal },
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
