import "dotenv/config";
import { randomUUID } from "crypto";

const baseUrl = process.env.APP_URL || "http://localhost:5005";
let cookieHeader = "";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": body ? "application/json" : "text/plain",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    cookieHeader = setCookie.split(";")[0];
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.ok) {
    const message = json.ok ? res.statusText : json.error.message;
    throw new Error(`${method} ${path} failed: ${message}`);
  }

  return json.data;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const unique = randomUUID().slice(0, 8);
  const username = `seller_${unique}`;
  const email = `seller_${unique}@example.com`;
  const password = "StrongPass123";

  console.log("Registering user...");
  await request("POST", "/api/auth/register", { username, email, password });

  console.log("Logging in...");
  await request("POST", "/api/auth/login", {
    usernameOrEmail: username,
    password,
  });

  console.log("Fetching /api/me...");
  const me = await request<{
    user: { id: number; username: string | null };
    profile: { displayName: string };
  }>("GET", "/api/me");
  assert(me.user.username === username, "Username mismatch after login");

  console.log("Updating profile...");
  const updated = await request<{ profile: { displayName: string } }>(
    "PATCH",
    "/api/me/profile",
    {
      displayName: "Test Seller",
      bio: "Smoke test profile",
      contactEmail: `test_${unique}@example.com`,
      whatsappNumber: "+971500000000",
    },
  );
  assert(
    updated.profile.displayName === "Test Seller",
    "Profile update failed",
  );

  console.log("Adding link...");
  const createdLink = await request<{ link: { id: number; title: string } }>(
    "POST",
    "/api/me/links",
    { title: "Shop", url: "https://example.com" },
  );
  assert(createdLink.link.title === "Shop", "Link creation failed");

  console.log("Listing links...");
  const linkList = await request<{ links: Array<{ id: number }> }>(
    "GET",
    "/api/me/links",
  );
  assert(
    linkList.links.some((link) => link.id === createdLink.link.id),
    "Created link not found",
  );

  console.log("Updating link...");
  await request("PATCH", `/api/me/links/${createdLink.link.id}`, {
    isActive: false,
  });

  console.log("Deleting link...");
  await request("DELETE", `/api/me/links/${createdLink.link.id}`);

  console.log("Creating review...");
  await request("POST", `/api/profile/${me.user.id}/reviews`, {
    authorName: "Buyer",
    rating: 5,
    comment: "Great experience!",
  });

  console.log("Fetching public reviews...");
  const publicReviews = await request<{
    reviews: Array<{ comment: string }>;
  }>("GET", `/api/profile/${me.user.id}/reviews`);
  assert(
    publicReviews.reviews.some(
      (review) => review.comment === "Great experience!",
    ),
    "Review not found",
  );

  console.log("Searching sellers...");
  const searchResults = await request<{
    results: Array<{ user: { username: string | null } }>;
  }>("GET", `/api/search?query=${username}`);
  assert(
    searchResults.results.some((result) => result.user.username === username),
    "Search did not return the seller",
  );

  console.log("Logging out...");
  await request("POST", "/api/auth/logout");

  console.log("Smoke test passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
