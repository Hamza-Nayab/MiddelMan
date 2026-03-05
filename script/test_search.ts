import "dotenv/config";
import { randomUUID } from "crypto";
import { Client } from "pg";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class SessionClient {
  private cookieHeader = "";
  constructor(private readonly baseUrl: string) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": body ? "application/json" : "text/plain",
        ...(this.cookieHeader ? { cookie: this.cookieHeader } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie.split(";")[0];
    }

    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !json.ok) {
      const message = json.ok ? res.statusText : json.error.message;
      throw new Error(`${method} ${path} failed: ${message}`);
    }
    return json.data;
  }
}

async function waitForServer(baseUrl: string, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not start in time");
}

async function main() {
  const testPort = Number(process.env.SEARCH_TEST_PORT || "5099");
  process.env.PORT = String(testPort);
  process.env.APP_URL = `http://localhost:${testPort}`;
  const baseUrl = process.env.APP_URL;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  await import("../server/index.ts");
  await waitForServer(baseUrl);

  const sql = new Client({ connectionString });
  await sql.connect();

  const unique = randomUUID().slice(0, 8);
  const sellerUsername = `srch_${unique}`;
  const sellerEmail = `${sellerUsername}@example.com`;
  const sellerPassword = "StrongPass123";
  const sellerDisplayName = `Search Seller ${unique}`;

  const sellerClient = new SessionClient(baseUrl);
  const sellerRegister = await sellerClient.request<{
    user: { id: number; username: string | null; role: string };
  }>("POST", "/api/auth/register", {
    displayName: sellerDisplayName,
    email: sellerEmail,
    password: sellerPassword,
    confirmPassword: sellerPassword,
    role: "seller",
    username: sellerUsername,
  });
  const sellerId = sellerRegister.user.id;

  // Insert one visible review directly for deterministic stats assertions.
  await sql.query(
    `INSERT INTO reviews (seller_id, author_name, rating, comment, is_hidden)
     VALUES ($1, $2, $3, $4, false)`,
    [sellerId, "search-tester", 5, "Excellent seller"],
  );

  // Seed additional sellers for pagination.
  const paginationPrefix = `pagi_${unique}`;
  for (let i = 0; i < 18; i += 1) {
    const uname = `${paginationPrefix}_${String(i).padStart(2, "0")}`;
    const email = `${uname}@example.com`;
    await sql.query(
      `INSERT INTO users (username, email, role, is_disabled)
       VALUES ($1, $2, 'seller', false)
       ON CONFLICT (username) DO NOTHING`,
      [uname, email],
    );
    await sql.query(
      `INSERT INTO profiles (user_id, display_name, bio, avatar_url)
       SELECT id, $2, $3, $4 FROM users WHERE username = $1
       ON CONFLICT (user_id) DO NOTHING`,
      [uname, `Paged Seller ${i}`, `Bio ${i}`, null],
    );
  }

  const anon = new SessionClient(baseUrl);

  // 1) Search returns correct results + stats shape
  const search1 = await anon.request<{
    results: Array<{
      username: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      avgRating: number;
      totalReviews: number;
    }>;
    meta: { nextOffset: number | null; hasMore: boolean };
  }>("GET", `/api/search?q=${sellerUsername.slice(0, 6)}`);
  const sellerRow = search1.results.find((r) => r.username === sellerUsername);
  assert(!!sellerRow, "Search should return created seller");
  assert((sellerRow?.totalReviews ?? 0) >= 1, "Search should include review stats");

  // 2) Query length < 2 returns empty
  const shortSearch = await anon.request<{
    results: Array<unknown>;
    meta: { nextOffset: number | null; hasMore: boolean };
  }>("GET", "/api/search?q=s");
  assert(shortSearch.results.length === 0, "Short query should return empty");

  // 3) Suggest endpoint works
  const suggest = await anon.request<{
    suggestions: Array<{ username: string; displayName: string }>;
  }>("GET", `/api/search/suggest?q=${sellerUsername.slice(0, 4)}`);
  assert(
    suggest.suggestions.some((s) => s.username === sellerUsername),
    "Suggest should return matching username",
  );

  // 4) Pagination works
  const page1 = await anon.request<{
    results: Array<{ username: string }>;
    meta: { nextOffset: number | null; hasMore: boolean };
  }>("GET", `/api/search?q=${paginationPrefix}&offset=0`);
  assert(page1.results.length === 15, "First page should return 15 results");
  assert(page1.meta.hasMore, "First page should indicate hasMore");
  assert(page1.meta.nextOffset === 15, "First page nextOffset should be 15");

  const page2 = await anon.request<{
    results: Array<{ username: string }>;
    meta: { nextOffset: number | null; hasMore: boolean };
  }>("GET", `/api/search?q=${paginationPrefix}&offset=15`);
  assert(page2.results.length >= 1, "Second page should return remaining results");

  console.log("Search tests passed.");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
