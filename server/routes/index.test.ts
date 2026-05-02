import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import express, { type Express } from "express";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.REVIEW_HASH_SALT ||= "test-salt";
process.env.APP_URL ||= "http://localhost:5010";

type DbOperation = "select" | "insert" | "update" | "delete" | "execute";
type QueueEntry = unknown | Error | (() => unknown | Promise<unknown>);

const dbQueues: Record<DbOperation, QueueEntry[]> = {
  select: [],
  insert: [],
  update: [],
  delete: [],
  execute: [],
};

const clearDbQueues = () => {
  for (const key of Object.keys(dbQueues) as DbOperation[]) {
    dbQueues[key] = [];
  }
};

const setDbQueues = (queues: Partial<Record<DbOperation, QueueEntry[]>>) => {
  clearDbQueues();
  for (const [key, value] of Object.entries(queues) as [
    DbOperation,
    QueueEntry[] | undefined,
  ][]) {
    dbQueues[key] = [...(value || [])];
  }
};

const assertDbQueuesEmpty = () => {
  for (const key of Object.keys(dbQueues) as DbOperation[]) {
    assert.equal(
      dbQueues[key].length,
      0,
      `unconsumed ${key} mocks: ${dbQueues[key].length}`,
    );
  }
};

const dequeue = async (op: DbOperation) => {
  if (dbQueues[op].length === 0) {
    if (op === "execute") {
      return [];
    }
    throw new Error(`Missing ${op} mock`);
  }

  const next = dbQueues[op].shift()!;
  if (next instanceof Error) {
    throw next;
  }

  const value = typeof next === "function" ? await next() : next;
  if (value instanceof Error) {
    throw value;
  }

  return value;
};

class FakeQueryBuilder<T = unknown> implements PromiseLike<T> {
  constructor(private readonly operation: Exclude<DbOperation, "execute">) {}

  from() {
    return this;
  }

  where() {
    return this;
  }

  leftJoin() {
    return this;
  }

  orderBy() {
    return this;
  }

  limit() {
    return this;
  }

  offset() {
    return this;
  }

  groupBy() {
    return this;
  }

  values() {
    return this;
  }

  set() {
    return this;
  }

  returning() {
    return this;
  }

  onConflictDoUpdate() {
    return this;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => dequeue(this.operation) as Promise<T>)
      .then(onfulfilled, onrejected);
  }
}

const makeUser = (
  overrides: Partial<{
    id: number;
    username: string | null;
    email: string;
    passwordHash: string | null;
    googleId: string | null;
    role: "buyer" | "seller" | "admin";
    emailVerified: boolean;
    verificationToken: string | null;
    verificationTokenExpires: Date | null;
    resetToken: string | null;
    resetTokenExpires: Date | null;
    lastUsernameChangedAt: Date | null;
    usernameChangeCount: number;
    createdAt: Date;
    updatedAt: Date;
    isDisabled: boolean;
    disabledReason: string | null;
    disabledAt: Date | null;
    disabledByAdminId: number | null;
    isMasterAdmin: boolean;
  }> = {},
) => ({
  id: 1,
  username: "seller-one",
  email: "user@example.com",
  passwordHash: "hashed",
  googleId: null,
  role: "seller" as const,
  emailVerified: false,
  verificationToken: null,
  verificationTokenExpires: null,
  resetToken: null,
  resetTokenExpires: null,
  lastUsernameChangedAt: null,
  usernameChangeCount: 0,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  isDisabled: false,
  disabledReason: null,
  disabledAt: null,
  disabledByAdminId: null,
  isMasterAdmin: false,
  ...overrides,
});

const sellerUser = makeUser({ id: 7, username: "seller-one", role: "seller" });
const buyerUser = makeUser({
  id: 8,
  username: "buyer-one",
  role: "buyer",
  email: "buyer@example.com",
});
const buyerWithoutUsername = makeUser({
  id: 12,
  username: null,
  role: "buyer",
  email: "buyer.no.username@example.com",
});
const adminUser = makeUser({
  id: 9,
  username: "admin-one",
  role: "admin",
  email: "admin@example.com",
});
const disabledAdminUser = makeUser({
  id: 11,
  username: "disabled-admin",
  role: "admin",
  email: "disabled-admin@example.com",
  isDisabled: true,
  disabledReason: "manual disable",
});
const masterAdminUser = makeUser({
  id: 10,
  username: "master-admin",
  role: "admin",
  email: "master@example.com",
  isMasterAdmin: true,
});

const makeProfile = (overrides: Record<string, unknown> = {}) => ({
  userId: sellerUser.id,
  displayName: "Seller One",
  bio: "Trusted seller",
  avatarUrl: null,
  contactEmail: null,
  whatsappNumber: null,
  phoneNumber: null,
  countryCode: null,
  isVerified: false,
  verificationMethod: "none",
  verificationStatus: "not_requested",
  verificationRequestNote: null,
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  theme: "light",
  backgroundPreset: null,
  gradientPreset: null,
  accentColor: null,
  avgRating: 4,
  totalReviews: 1,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-02T00:00:00.000Z"),
  ...overrides,
});

let app: Express;
let baseUrl = "";
let httpServer: Awaited<ReturnType<Express["listen"]>>;
let registerAllRoutes: (app: Express) => Promise<void>;

const expectedRoutes = [
  "DELETE /api/admin/disputes/:id/evidence",
  "DELETE /api/me/links/:id",
  "GET /api/admin/admins",
  "GET /api/admin/analytics/overview",
  "GET /api/admin/disputes",
  "GET /api/admin/reviews",
  "GET /api/admin/sellers/:sellerId",
  "GET /api/admin/users",
  "GET /api/auth/google",
  "GET /api/auth/google/callback",
  "GET /api/auth/verify-email",
  "GET /api/health",
  "GET /api/me",
  "GET /api/me/analytics",
  "GET /api/me/links",
  "GET /api/me/notifications",
  "GET /api/me/reviews",
  "GET /api/me/reviews/given",
  "GET /api/profile/:userId/links",
  "GET /api/profile/:userId/reviews",
  "GET /api/profile/:username",
  "GET /api/profile/:username/bundle",
  "GET /api/search",
  "GET /api/search/suggest",
  "GET /api/username/check",
  "GET /sitemap.xml",
  "PATCH /api/admin/disputes/:id/resolve",
  "PATCH /api/admin/reviews/:id/hide",
  "PATCH /api/admin/users/:id/disable",
  "PATCH /api/admin/users/:id/enable",
  "PATCH /api/admin/users/:id/role",
  "PATCH /api/me/links/:id",
  "PATCH /api/me/links/reorder",
  "PATCH /api/me/notifications/:id/read",
  "PATCH /api/me/onboarding",
  "PATCH /api/me/profile",
  "PATCH /api/me/reviews/:id/response",
  "PATCH /api/me/reviews/given/:id",
  "PATCH /api/me/role",
  "PATCH /api/me/username",
  "POST /api/admin/admins",
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "POST /api/auth/register",
  "POST /api/auth/forgot-password",
  "POST /api/auth/resend-verification",
  "POST /api/auth/reset-password",
  "POST /api/me/avatar",
  "POST /api/me/links",
  "POST /api/me/notifications/mark-all-read",
  "POST /api/me/reviews/:reviewId/dispute",
  "POST /api/me/reviews/:reviewId/dispute/evidence",
  "POST /api/me/verification/request",
  "POST /api/profile/:userId/click",
  "POST /api/profile/:userId/reviews",
  "POST /api/profile/:username/report",
  "POST /api/reviews/:id/report",
].sort();

const routeSignatures = () => {
  const stack = (app as any)._router?.stack || [];
  return stack
    .filter((layer: any) => layer.route)
    .flatMap((layer: any) =>
      Object.entries(layer.route.methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => `${method.toUpperCase()} ${layer.route.path}`),
    )
    .sort();
};

const request = async (
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    redirect?: RequestRedirect;
  } = {},
) => {
  const headers = new Headers(options.headers);
  const init: RequestInit = { method, headers, redirect: options.redirect };

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, status: response.status, body };
};

before(async () => {
  const [{ registerAllRoutes: importedRegisterAllRoutes }, { db }] =
    await Promise.all([import("./all.routes.ts"), import("../db.ts")]);

  registerAllRoutes = importedRegisterAllRoutes;

  (db as any).select = () => new FakeQueryBuilder("select");
  (db as any).insert = () => new FakeQueryBuilder("insert");
  (db as any).update = () => new FakeQueryBuilder("update");
  (db as any).delete = () => new FakeQueryBuilder("delete");
  (db as any).execute = () => dequeue("execute");

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, _res, next) => {
    const headerUserId = req.header("x-test-user-id");
    const session = {
      id: req.header("x-test-session-id") || "test-session",
      userId: headerUserId ? Number(headerUserId) : undefined,
      save: (cb: (err?: unknown) => void) => cb(),
      destroy: (cb: (err?: unknown) => void) => {
        session.userId = undefined;
        cb();
      },
      cookie: {},
    };
    (req as any).session = session;
    next();
  });

  clearDbQueues();
  await registerAllRoutes(app);

  httpServer = app.listen(0);
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("registerAllRoutes", () => {
  it("registers the same paths once without duplicates", async () => {
    const initial = routeSignatures();
    assert.deepEqual(initial, expectedRoutes);
    assert.equal(new Set(initial).size, initial.length);

    await registerAllRoutes(app);

    const afterSecondCall = routeSignatures();
    assert.deepEqual(afterSecondCall, initial);
  });
});

describe("route groups", () => {
  it("health", async () => {
    setDbQueues({});
    const result = await request("GET", "/api/health");

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.data.db, "ok");
    assertDbQueuesEmpty();
  });

  it("auth", async () => {
    setDbQueues({ select: [[]] });
    const usernameCheck = await request(
      "GET",
      "/api/username/check?username=seller1",
    );
    assert.equal(usernameCheck.status, 200);
    assert.equal(usernameCheck.body.data.available, true);
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("POST", "/api/me/avatar");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({});
    const invalidRegister = await request("POST", "/api/auth/register", {
      body: {},
    });
    assert.equal(invalidRegister.status, 400);
    assert.equal(invalidRegister.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();

    const hashedPassword = await bcrypt.hash("password123", 10);
    const createdSeller = makeUser({
      id: 22,
      username: "seller-new",
      email: "seller.new@example.com",
      role: "seller",
      passwordHash: hashedPassword,
    });

    setDbQueues({
      select: [[], []],
      insert: [[createdSeller], []],
      update: [[]],
    });
    const registerSeller = await request("POST", "/api/auth/register", {
      body: {
        displayName: "Seller New",
        email: "seller.new@example.com",
        password: "password123",
        confirmPassword: "password123",
        role: "seller",
        username: "seller-new",
      },
    });
    assert.equal(registerSeller.status, 201);
    assert.equal(registerSeller.body.data.user.username, "seller-new");
    assertDbQueuesEmpty();

    const verifiedSeller = makeUser({
      id: 22,
      username: "seller-new",
      email: "seller.new@example.com",
      role: "seller",
      passwordHash: hashedPassword,
      verificationToken: "verify-token",
      verificationTokenExpires: new Date("2030-04-30T00:00:00.000Z"),
    });

    setDbQueues({
      select: [[verifiedSeller]],
      update: [[]],
    });
    const verifyEmail = await request(
      "GET",
      "/api/auth/verify-email?token=verify-token",
      {
        redirect: "manual",
      },
    );
    assert.equal(verifyEmail.status, 302);
    assert.match(
      verifyEmail.response.headers.get("location") || "",
      /\/verified\?success=1/,
    );
    assertDbQueuesEmpty();

    const expiredSeller = makeUser({
      id: 23,
      username: "seller-old",
      email: "seller.old@example.com",
      role: "seller",
      passwordHash: hashedPassword,
      verificationToken: "expired-token",
      verificationTokenExpires: new Date("2020-01-01T00:00:00.000Z"),
    });

    setDbQueues({
      select: [[expiredSeller]],
      update: [[]],
    });
    const expiredVerify = await request(
      "GET",
      "/api/auth/verify-email?token=expired-token",
      {
        redirect: "manual",
      },
    );
    assert.equal(expiredVerify.status, 302);
    assert.match(
      expiredVerify.response.headers.get("location") || "",
      /error=expired/,
    );
    assertDbQueuesEmpty();

    setDbQueues({ select: [[]] });
    const forgotMissing = await request("POST", "/api/auth/forgot-password", {
      body: { email: "missing@example.com" },
    });
    assert.equal(forgotMissing.status, 200);
    assert.equal(
      forgotMissing.body.data.message,
      "If this email exists, a reset link has been sent.",
    );
    assertDbQueuesEmpty();

    const forgotSeller = makeUser({
      id: 25,
      username: "seller-forgot",
      email: "seller.forgot@example.com",
      role: "seller",
      passwordHash: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    setDbQueues({
      select: [[forgotSeller]],
      update: [[]],
    });
    const forgotExisting = await request("POST", "/api/auth/forgot-password", {
      body: { email: "seller.forgot@example.com" },
    });
    assert.equal(forgotExisting.status, 200);
    assert.equal(
      forgotExisting.body.data.message,
      "If this email exists, a reset link has been sent.",
    );
    assertDbQueuesEmpty();

    // Second forgot-password for same account should be rate limited (3 days)
    setDbQueues({ select: [[forgotSeller]] });
    const forgotAgain = await request("POST", "/api/auth/forgot-password", {
      body: { email: "seller.forgot@example.com" },
    });
    assert.equal(forgotAgain.status, 429);
    assert.equal(forgotAgain.body.error.code, "RATE_LIMIT");
    assertDbQueuesEmpty();

    const resetSeller = makeUser({
      id: 24,
      username: "seller-reset",
      email: "seller.reset@example.com",
      role: "seller",
      passwordHash: hashedPassword,
      resetToken: "reset-token",
      resetTokenExpires: new Date("2030-05-01T01:00:00.000Z"),
    });

    setDbQueues({
      select: [[resetSeller]],
      update: [[]],
    });
    const resetPassword = await request("POST", "/api/auth/reset-password", {
      body: { token: "reset-token", newPassword: "newpassword123" },
    });
    assert.equal(resetPassword.status, 200);
    assert.equal(
      resetPassword.body.data.message,
      "Password changed successfully!",
    );
    assertDbQueuesEmpty();

    // Resend verification endpoint: seller can request a resend once
    const resendSeller = makeUser({
      id: 26,
      username: "seller-resend",
      email: "seller.resend@example.com",
      role: "seller",
      passwordHash: hashedPassword,
      emailVerified: false,
    });

    setDbQueues({ select: [[resendSeller]], update: [[]] });
    const resendResp = await request("POST", "/api/auth/resend-verification", {
      headers: { "x-test-user-id": String(resendSeller.id) },
    });
    assert.equal(resendResp.status, 200);
    assert.equal(resendResp.body.data.message, "Verification email sent");
    assertDbQueuesEmpty();

    // Second resend within 3 days should be rate limited
    setDbQueues({ select: [[resendSeller]] });
    const resendAgain = await request("POST", "/api/auth/resend-verification", {
      headers: { "x-test-user-id": String(resendSeller.id) },
    });
    assert.equal(resendAgain.status, 429);
    assert.equal(resendAgain.body.error.code, "RATE_LIMIT");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[]] });
    const invalidReset = await request("POST", "/api/auth/reset-password", {
      body: { token: "bad-token", newPassword: "newpassword123" },
    });
    assert.equal(invalidReset.status, 400);
    assert.equal(invalidReset.body.error.code, "INVALID_TOKEN");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[createdSeller]],
    });
    const loginSeller = await request("POST", "/api/auth/login", {
      body: {
        loginType: "seller",
        usernameOrEmail: "seller-new",
        password: "password123",
      },
    });
    assert.equal(loginSeller.status, 200);
    assert.equal(loginSeller.body.data.user.id, createdSeller.id);
    assertDbQueuesEmpty();
  });

  it("profile", async () => {
    setDbQueues({
      select: [
        [sellerUser],
        [makeProfile()],
        [{ avgRating: 4, totalReviews: 1 }],
      ],
    });
    const profile = await request("GET", "/api/profile/seller-one");
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.user.username, "seller-one");
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("PATCH", "/api/me/profile", {
      body: { displayName: "New Name" },
    });
    assert.equal(unauthorized.status, 403);
    assert.equal(unauthorized.body.error.code, "FORBIDDEN");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[sellerUser]] });
    const invalid = await request("PATCH", "/api/me/profile", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: {},
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();

    const updatedProfile = {
      ...makeProfile(),
      displayName: "Updated Seller",
      bio: "Updated bio",
    };
    setDbQueues({
      select: [[sellerUser]],
      update: [[updatedProfile]],
    });
    const updated = await request("PATCH", "/api/me/profile", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: {
        displayName: "Updated Seller",
        bio: "Updated bio",
      },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.profile.displayName, "Updated Seller");
    assertDbQueuesEmpty();
  });

  it("links", async () => {
    setDbQueues({
      select: [[[{ id: 1, title: "Site", url: "https://example.com" }][0]]],
    });
    const publicLinks = await request(
      "GET",
      `/api/profile/${sellerUser.id}/links`,
    );
    assert.equal(publicLinks.status, 200);
    assert.equal(publicLinks.body.ok, true);
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("GET", "/api/me/links");
    assert.equal(unauthorized.status, 403);
    assert.equal(unauthorized.body.error.code, "FORBIDDEN");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[sellerUser]] });
    const invalid = await request("POST", "/api/me/links", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: { title: "Bad", url: "http://example.com" },
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[sellerUser], [{ count: 0 }]],
      insert: [
        [
          {
            id: 301,
            userId: sellerUser.id,
            title: "Site",
            url: "https://example.com",
            sortOrder: 0,
          },
        ],
      ],
    });
    const addLink = await request("POST", "/api/me/links", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: { title: "Site", url: "https://example.com" },
    });
    assert.equal(addLink.status, 201);
    assert.equal(addLink.body.data.link.id, 301);
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[sellerUser], [{ id: 301 }]],
      update: [
        [{ id: 301, title: "Site Updated", url: "https://example.org" }],
      ],
    });
    const editLink = await request("PATCH", "/api/me/links/301", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: { title: "Site Updated", url: "https://example.org" },
    });
    assert.equal(editLink.status, 200);
    assert.equal(editLink.body.data.link.title, "Site Updated");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[sellerUser]],
      delete: [[{ id: 301 }]],
    });
    const deleteLink = await request("DELETE", "/api/me/links/301", {
      headers: { "x-test-user-id": String(sellerUser.id) },
    });
    assert.equal(deleteLink.status, 200);
    assert.equal(deleteLink.body.data.deleted, true);
    assertDbQueuesEmpty();
  });

  it("reviews", async () => {
    setDbQueues({
      select: [
        [
          {
            id: 55,
            sellerId: sellerUser.id,
            reviewerUserId: buyerUser.id,
            authorName: "buyer-one",
            rating: 5,
            comment: "Great",
            isHidden: false,
            ipHash: "hash",
            userAgentHash: null,
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
          },
        ],
        [{ rating: 5, count: 1 }],
      ],
    });
    const publicReviews = await request(
      "GET",
      `/api/profile/${sellerUser.id}/reviews`,
    );
    assert.equal(publicReviews.status, 200);
    assert.equal(publicReviews.body.data.stats.totalReviews, 1);
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request(
      "POST",
      `/api/profile/${sellerUser.id}/reviews`,
      {
        body: { rating: 5, comment: "Great" },
      },
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[buyerUser]] });
    const invalid = await request(
      "POST",
      `/api/profile/${sellerUser.id}/reviews`,
      {
        headers: { "x-test-user-id": String(buyerUser.id) },
        body: {},
      },
    );
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [
        [buyerUser],
        [{ id: sellerUser.id, role: "seller" }],
        [buyerUser],
        [{ displayName: "Buyer One" }],
        [{ count: 0 }],
        [],
        [],
        [{ avgRating: 4, totalReviews: 2 }],
      ],
      insert: [
        [
          {
            id: 77,
            sellerId: sellerUser.id,
            reviewerUserId: buyerUser.id,
            rating: 5,
            comment: "Great seller",
          },
        ],
      ],
      update: [[]],
    });
    const createdReview = await request(
      "POST",
      `/api/profile/${sellerUser.id}/reviews`,
      {
        headers: { "x-test-user-id": String(buyerUser.id) },
        body: { rating: 5, comment: "Great seller" },
      },
    );
    assert.equal(createdReview.status, 201);
    assert.equal(createdReview.body.data.review.id, 77);
    assertDbQueuesEmpty();

    setDbQueues({
      select: [
        [buyerWithoutUsername],
        [{ id: sellerUser.id, role: "seller" }],
        [buyerWithoutUsername],
        [{ displayName: "Rana" }],
        [{ count: 0 }],
        [],
        [],
        [{ avgRating: 4, totalReviews: 2 }],
      ],
      insert: [
        [
          {
            id: 78,
            sellerId: sellerUser.id,
            reviewerUserId: buyerWithoutUsername.id,
            authorName: "Rana",
            rating: 5,
            comment: "Great seller again",
          },
        ],
      ],
      update: [[]],
    });
    const createdReviewWithoutUsername = await request(
      "POST",
      `/api/profile/${sellerUser.id}/reviews`,
      {
        headers: { "x-test-user-id": String(buyerWithoutUsername.id) },
        body: { rating: 5, comment: "Great seller again" },
      },
    );
    assert.equal(createdReviewWithoutUsername.status, 201);
    assert.equal(
      createdReviewWithoutUsername.body.data.review.authorName,
      "Rana",
    );
    assertDbQueuesEmpty();
  });

  it("disputes", async () => {
    setDbQueues({
      select: [[{ id: 41, sellerId: sellerUser.id }], []],
      insert: [
        [{ id: 90, reviewId: 41, sellerId: sellerUser.id, status: "open" }],
      ],
    });
    const created = await request("POST", "/api/me/reviews/41/dispute", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: { reason: "fake", message: "please review" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.dispute.status, "open");
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("POST", "/api/me/reviews/41/dispute", {
      body: { reason: "fake" },
    });
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({});
    const invalid = await request("POST", "/api/me/reviews/41/dispute", {
      headers: { "x-test-user-id": String(sellerUser.id) },
      body: {},
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();
  });

  it("admin", async () => {
    setDbQueues({});
    const unauthorized = await request("GET", "/api/admin/users");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [
        [adminUser],
        [
          [
            {
              id: sellerUser.id,
              username: sellerUser.username,
              email: sellerUser.email,
              role: sellerUser.role,
              isDisabled: false,
              disabledReason: null,
              createdAt: sellerUser.createdAt,
              isMasterAdmin: false,
            },
          ][0],
        ],
      ],
    });
    const usersList = await request("GET", "/api/admin/users", {
      headers: { "x-test-user-id": String(adminUser.id) },
    });
    assert.equal(usersList.status, 200);
    assert.equal(usersList.body.data.items.length, 1);
    assertDbQueuesEmpty();

    setDbQueues({ select: [[sellerUser]] });
    const forbidden = await request("GET", "/api/admin/users", {
      headers: { "x-test-user-id": String(sellerUser.id) },
    });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.code, "FORBIDDEN");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[adminUser]] });
    const invalid = await request("GET", "/api/admin/users?disabled=maybe", {
      headers: { "x-test-user-id": String(adminUser.id) },
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[disabledAdminUser]] });
    const disabled = await request("GET", "/api/admin/users", {
      headers: { "x-test-user-id": String(disabledAdminUser.id) },
    });
    assert.equal(disabled.status, 403);
    assert.equal(disabled.body.error.code, "ACCOUNT_DISABLED");
    assertDbQueuesEmpty();

    setDbQueues({ select: [[adminUser]] });
    const masterOnlyForbidden = await request("GET", "/api/admin/admins", {
      headers: { "x-test-user-id": String(adminUser.id) },
    });
    assert.equal(masterOnlyForbidden.status, 403);
    assert.equal(masterOnlyForbidden.body.error.code, "FORBIDDEN");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[adminUser]],
      update: [[{ ...sellerUser, isDisabled: true, disabledReason: null }]],
      insert: [[]],
    });
    const disableUser = await request(
      "PATCH",
      `/api/admin/users/${sellerUser.id}/disable`,
      {
        headers: { "x-test-user-id": String(adminUser.id) },
        body: {},
      },
    );
    assert.equal(disableUser.status, 200);
    assert.equal(disableUser.body.data.user.isDisabled, true);
    assertDbQueuesEmpty();

    setDbQueues({
      select: [[adminUser], [{ avgRating: 4, totalReviews: 1 }]],
      update: [[{ id: 41, sellerId: sellerUser.id, isHidden: true }], []],
      insert: [[]],
    });
    const moderateReview = await request(
      "PATCH",
      "/api/admin/reviews/41/hide",
      {
        headers: { "x-test-user-id": String(adminUser.id) },
        body: { isHidden: true, reason: "policy" },
      },
    );
    assert.equal(moderateReview.status, 200);
    assert.equal(moderateReview.body.data.review.isHidden, true);
    assertDbQueuesEmpty();

    setDbQueues({
      select: [
        [adminUser],
        [{ dispute: { id: 501, reviewId: 41, sellerId: sellerUser.id } }],
        [{ avgRating: 4, totalReviews: 1 }],
      ],
      update: [
        [{ id: 501, status: "resolved_valid" }],
        [{ sellerId: sellerUser.id }],
        [],
      ],
      insert: [[], []],
    });
    const resolveDispute = await request(
      "PATCH",
      "/api/admin/disputes/501/resolve",
      {
        headers: { "x-test-user-id": String(adminUser.id) },
        body: { outcome: "valid", resolutionNote: "accepted" },
      },
    );
    assert.equal(resolveDispute.status, 200);
    assert.equal(resolveDispute.body.data.dispute.status, "resolved_valid");
    assertDbQueuesEmpty();
  });

  it("search", async () => {
    setDbQueues({
      select: [
        [
          {
            userId: sellerUser.id,
            username: sellerUser.username,
            displayName: "Seller One",
            bio: "Trusted",
            avatarUrl: null,
            searchScore: 100,
          },
        ],
        [{ sellerId: sellerUser.id, avgRating: 4.5, totalReviews: 2 }],
      ],
    });
    const search = await request("GET", "/api/search?q=seller&limit=5");
    assert.equal(search.status, 200);
    assert.equal(Array.isArray(search.body.data.results), true);
    assert.equal(search.body.data.results[0].username, "seller-one");
    assertDbQueuesEmpty();
  });

  it("analytics", async () => {
    setDbQueues({
      select: [
        [{ id: sellerUser.id, role: "seller" }],
        [{ day: "2026-03-15", views: 4, clicks: 1 }],
      ],
    });
    const mine = await request("GET", "/api/me/analytics", {
      headers: { "x-test-user-id": String(sellerUser.id) },
    });
    assert.equal(mine.status, 200);
    assert.equal(Array.isArray(mine.body.data.days), true);
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("GET", "/api/me/analytics");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({
      select: [
        [adminUser],
        [{ totalViews: 10, totalClicks: 5 }],
        [
          {
            userId: sellerUser.id,
            username: sellerUser.username,
            displayName: "Seller One",
            views: 10,
          },
        ],
        [
          {
            userId: sellerUser.id,
            username: sellerUser.username,
            displayName: "Seller One",
            clicks: 5,
          },
        ],
      ],
    });
    const overview = await request(
      "GET",
      "/api/admin/analytics/overview?days=7",
      {
        headers: { "x-test-user-id": String(adminUser.id) },
      },
    );
    assert.equal(overview.status, 200);
    assert.equal(overview.body.data.totalViews, 10);
    assertDbQueuesEmpty();
  });

  it("notifications", async () => {
    setDbQueues({
      select: [
        [
          [
            {
              id: 1,
              userId: buyerUser.id,
              type: "dispute_accepted",
              title: "Title",
              message: "Message",
              relatedId: 2,
              isRead: false,
              createdAt: new Date("2026-03-10T00:00:00.000Z"),
            },
          ][0],
        ],
        [{ count: 1 }],
      ],
    });
    const list = await request("GET", "/api/me/notifications", {
      headers: { "x-test-user-id": String(buyerUser.id) },
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.unreadCount, 1);
    assertDbQueuesEmpty();

    setDbQueues({});
    const unauthorized = await request("GET", "/api/me/notifications");
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");
    assertDbQueuesEmpty();

    setDbQueues({});
    const invalid = await request("GET", "/api/me/notifications?limit=bad", {
      headers: { "x-test-user-id": String(buyerUser.id) },
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assertDbQueuesEmpty();
  });

  it("sitemap", async () => {
    setDbQueues({
      select: [
        [
          {
            username: sellerUser.username,
            updatedAt: new Date("2026-03-12T00:00:00.000Z"),
          },
        ],
      ],
    });
    const sitemap = await request("GET", "/sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.body, /<urlset/);
    assert.match(sitemap.body, /seller-one/);
    assertDbQueuesEmpty();
  });
});
