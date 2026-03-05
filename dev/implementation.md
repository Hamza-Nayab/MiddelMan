# MiddelMen – IMPLEMENTATION_PLAN (Copilot Context)

Last updated: 2026-02-17

## 0) One-line Product

MiddelMen is a trust layer for social-commerce sellers (Instagram/Facebook/WhatsApp):

- A public trust profile page for each seller
- Reviews + reputation scoring (Phase 1)
- Escrow payments + disputes (Phase 2)

## 1) Goals

### Phase 1 (Market Deployable v1)

Ship a real, deployable version that replaces all mock/localStorage logic with:

- Real database (online Postgres)
- Real API (CRUD for profile/links/reviews/search)
- Real auth (sessions + Google OAuth)
- Review anti-spam protections
- Basic seller verification (IG handle + WhatsApp + “verified” badge)
- Minimal admin controls (hide review, flag seller)

### Phase 2 (Trust + Money)

- Escrow payments
- Transaction state machine
- Disputes workflow
- Payout to sellers (via provider)

### Non-goals for v1

- Escrow (unless explicitly decided)
- Complex moderation ML
- Mobile app

---

## 2) Current Repo State (Observed)

### Frontend

- Pages exist: auth, dashboard, profile, search
- Uses `client/src/lib/mock-api.ts` which stores data in `localStorage`
- UX is solid for MVP but not real data-backed

### Backend

- `server/routes.ts` is mostly empty / not implementing real endpoints
- `server/storage.ts` is in-memory (not persistent)
- `shared/schema.ts` only has minimal `users` table (username/password style)

### Conclusion

This repo is a prototype. To deploy for real users:

- remove mock-api usage
- implement DB + API + auth

---

## 3) Recommended Tech Stack (v1)

### Core

- TypeScript
- React (existing)
- Node.js backend logic (existing)
- Postgres (online)
- Drizzle ORM (existing pattern via `shared/schema.ts`)
- Authentication: sessions + Passport (existing libs likely present) OR NextAuth/Auth.js if moving to Next

### Deployment (Choose ONE)

#### Option A (Recommended if you want everything on Vercel)

- Frontend: Vercel
- Backend: Vercel Serverless Functions (Next.js API routes)
- DB: Neon Postgres (free tier) or Vercel Postgres/Neon integration

Pros: single deploy, simplest ops  
Cons: you must move Express routes to Next API routes (or wrap Express, which is messier)

#### Option B (If you want to keep Express)

- Frontend: Vercel
- Backend: Render/Railway (Express)
- DB: Neon/Supabase/Railway Postgres

Pros: minimal backend refactor  
Cons: two deployments + CORS/cookies complexity

**DECISION:** Prefer Option A for Vercel simplicity.
If you choose Option B, follow the same API contract, just deployed separately.

---

## 4) UI/Brand Guidelines (Important for consistency)

### Theme

- Style: modern, minimal, “trust + safety”
- Layout: rounded cards, soft shadows, generous whitespace
- Fonts: keep current project font; if adding, prefer Inter

### Color Tokens (Use variables in CSS/Tailwind theme)

Primary (Trust Blue): #2563EB
Primary Hover: #1D4ED8
Success (Verified Green): #16A34A
Warning (Amber): #F59E0B
Danger (Red): #DC2626

Background: #0B1220 (dark) OR #F8FAFC (light)
Card Surface: #111827 (dark) OR #FFFFFF (light)
Border/Subtle: #1F2937 (dark) OR #E2E8F0 (light)
Text Primary: #E5E7EB (dark) OR #0F172A (light)
Text Secondary: #94A3B8 (dark) OR #475569 (light)

### UI Components must visually communicate:

- “Verified Seller” badge (green)
- “Protected Transaction” badge (Phase 2)
- Ratings consistently (stars 1–5)
- Status chips for lifecycle states (later)

---

## 5) Data Model (Drizzle Schema) – v1

Implement in: `shared/schema.ts` (or wherever your Drizzle schema lives)

### 5.1 users

Purpose: identity + auth linkage
Fields:

- id: serial/uuid primary key
- username: unique, nullable (google-only users may not set it immediately)
- email: unique, nullable
- passwordHash: nullable (google users may not have a password)
- googleId: unique, nullable
- role: enum('user','admin') default 'user'
- createdAt, updatedAt

Constraints:

- unique(email) when not null
- unique(username) when not null
- unique(googleId) when not null

### 5.2 profiles

Purpose: public seller profile
Fields:

- userId: fk users.id, unique (1:1)
- displayName
- bio
- avatarUrl
- instagramHandle
- whatsappNumber
- isVerified: boolean default false
- verificationMethod: enum('none','ig_bio_code','whatsapp_otp','manual') default 'none'
- createdAt, updatedAt

Constraints:

- unique(instagramHandle) optional but recommended to prevent impersonation

### 5.3 links

Purpose: seller’s links list
Fields:

- id pk
- userId fk users.id
- title
- url
- isActive boolean default true
- sortOrder integer default 0
- createdAt, updatedAt

### 5.4 reviews

Purpose: reputation layer
Fields:

- id pk
- sellerId fk users.id
- authorName (string, required)
- rating int (1..5)
- comment text
- isHidden boolean default false
- createdAt
  Anti-spam:
- ipHash (nullable string)
- userAgentHash (nullable)
- optional: reviewerUserId fk users.id nullable (if logged-in reviews later)

Indexes:

- index(sellerId, createdAt desc)
- index(ipHash, sellerId, createdAt) for rate limiting

### (Phase 2 tables later)

- transactions
- disputes
- payouts

---

## 6) API Contract – v1

All responses JSON. Validate input with zod.

### 6.1 Public

- GET /api/profile/:username
  returns: { userId, username, profile, stats }
  stats: { avgRating, totalReviews }

- GET /api/profile/:userId/links
  returns: { links: Link[] }

- GET /api/profile/:userId/reviews
  returns: { reviews: Review[], stats }

- POST /api/profile/:userId/reviews
  body: { authorName, rating, comment }
  behavior:
  - rate limit by ipHash per seller (e.g. 3 per 24h)
  - store ipHash (not raw IP)
    returns: created review

- GET /api/search?query=...
  searches sellers by username, displayName, instagramHandle

### 6.2 Auth

- POST /api/auth/register
  body: { username, email?, password }
  returns: user minimal

- POST /api/auth/login
  body: { usernameOrEmail, password }
  returns: user minimal

- POST /api/auth/logout
  returns: ok

- GET /api/me
  returns: { user, profile }

### 6.3 Seller Dashboard (auth required)

- PATCH /api/me/profile
  body: { displayName, bio, avatarUrl, instagramHandle, whatsappNumber }

- POST /api/me/links
  body: { title, url }

- PATCH /api/me/links/:id
  body: { title?, url?, isActive?, sortOrder? }

- DELETE /api/me/links/:id

- PATCH /api/me/reviews/:id/toggle-hidden
  body: { isHidden: boolean }

### 6.4 Admin (auth required, role=admin)

- GET /api/admin/reviews?hidden=&sellerId=
- PATCH /api/admin/reviews/:id/hide
- PATCH /api/admin/users/:id/flag (optional)
- PATCH /api/admin/users/:id/role (optional)

---

## 7) Auth Strategy

### v1 minimal

- Cookie-based sessions (secure cookies in prod)
- Local auth: username/password with bcrypt hashing
- Google OAuth: login with Google + link to user

### Requirements

- Protect seller routes: must be logged in
- Protect admin routes: must be admin role
- Store sessions in Postgres (if using Express) OR use NextAuth session strategy (if Next)

---

## 8) Review Anti-Spam (Must-have before public launch)

Implement:

1. Rate limit per seller + IP:
   - max 3 reviews / 24h / seller / ipHash
2. Validate content:
   - rating 1..5
   - comment max length (e.g. 500 chars)
   - authorName max length (e.g. 50)
3. Basic abuse prevention:
   - reject repeated identical comments from same ipHash
4. Optional:
   - add “review link token” sellers can share (Phase 1.5)

IP hashing rule:

- ipHash = sha256(ip + REVIEW_HASH_SALT)
- Never store raw IP

---

## 9) Frontend Refactor (Replace mock API)

### Current

`client/src/lib/mock-api.ts` powers everything.

### Target

Create `client/src/lib/api.ts` using `fetch`:

- baseURL: same-origin in production
- handle errors consistently
- include credentials (cookies) if using sessions

Implementation steps:

1. Create `client/src/lib/api.ts`:
   - functions: login, register, me, getProfile, getLinks, getReviews, postReview, updateProfile, links CRUD
2. Update pages to use real API:
   - `client/src/pages/auth.tsx`
   - `client/src/pages/profile.tsx`
   - `client/src/pages/dashboard.tsx`
   - `client/src/pages/search.tsx`
3. Delete or quarantine mock api once all pages migrated.

Acceptance:

- No `localStorage` usage for core data
- Refresh page still shows same data (DB persists)

---

## 10) Step-by-Step Build Order (DO NOT SKIP ORDER)

### Step 1 — Decide deployment path

A) Vercel fullstack with Next.js API routes (recommended)
B) Keep Express backend deployed separately

**If choosing A:**

- Convert project to Next.js (or create `/api` folder)
- Move backend routes to Next API handlers

**If choosing B:**

- Keep Express, deploy on Render/Railway
- Configure CORS + cookies

(Everything below still applies—only implementation locations differ.)

---

### Step 2 — Create online Postgres (Neon)

1. Create Neon DB
2. Copy connection string
3. Add to `.env` locally:
   DATABASE_URL=...
4. Add to Vercel env vars:
   - DATABASE_URL
   - REVIEW_HASH_SALT
   - SESSION_SECRET (if sessions)
   - GOOGLE_CLIENT_ID/SECRET (later)
5. Confirm DB connectivity from local dev

---

### Step 3 — Expand Drizzle schema

Files:

- `shared/schema.ts`

Implement tables:

- users (upgrade fields)
- profiles
- links
- reviews

Then run migrations:

- drizzle push / migration generation (project-specific command)
  Confirm tables exist in DB.

---

### Step 4 — Implement backend DB access layer

Create folder:

- `server/db/` (or `src/db/` depending on structure)

Add:

- `db.ts` (drizzle client)
- `queries/users.ts`
- `queries/profiles.ts`
- `queries/links.ts`
- `queries/reviews.ts`

Each query file contains:

- create/read/update functions
- input validation (zod at route layer)

---

### Step 5 — Implement auth (local sessions)

Backend tasks:

- bcrypt hashing
- register/login/logout
- /me endpoint

Acceptance:

- register -> logged in
- login -> sets cookie
- /me returns user
- logout clears cookie

---

### Step 6 — Build public profile endpoints

Implement:

- GET profile by username
- GET links by userId
- GET reviews by userId (include stats)
- search endpoint

Acceptance:

- Public user can view a seller page with real DB data

---

### Step 7 — Build seller dashboard endpoints

Implement:

- PATCH profile
- links CRUD
- toggle review hidden

Acceptance:

- Seller can add/edit links and see reflected on public page
- Seller can hide reviews (only hides display; admin can still see)

---

### Step 8 — Replace frontend mock API with real API

Update:

- auth page: use /api/auth/\*
- dashboard: /api/me + links + profile update
- profile page: public endpoints
- search page: /api/search

Acceptance:

- End-to-end works without mock/localStorage

---

### Step 9 — Add review anti-spam

Implement rate limiting logic in POST review route:

- compute ipHash
- query count in last 24h for that sellerId+ipHash
- reject if exceeds
- reject if duplicate content in last 24h

Acceptance:

- user cannot spam unlimited reviews

---

### Step 10 — Add Google OAuth

Implement:

- Google login start route
- callback route
- user linking/creation
  Update DB:
- store googleId + email
  Edge cases:
- user registers with email/password then later uses google with same email -> link accounts

Acceptance:

- Seller can login with Google and use dashboard

---

### Step 11 — Add basic seller verification

MVP version:

- Seller enters instagramHandle
- Verification method A (easy):
  - Show code in dashboard: MIDDLEMEN-XXXX
  - Seller must put it in IG bio
  - Seller clicks “Verify”
  - Backend verifies by asking seller to paste screenshot OR manual admin step (v1)
    If you can’t do automated IG checks (common), do manual verification at first.

Acceptance:

- Verified badge appears on profile

---

### Step 12 — Minimal Admin tools

Implement role-based access:

- admin can hide any review
- admin can flag seller profile

Acceptance:

- You can moderate without redeploying

---

### Step 13 — Production hardening

- input validation everywhere
- server-side error handling
- logging
- security headers (basic)
- cookie secure flags
- ensure DB connection pooling appropriate to Vercel (avoid too many connections)

Acceptance:

- works on production URL with real DB persistence

---

## 11) Environment Variables (Production)

Required:

- DATABASE_URL
- SESSION_SECRET
- REVIEW_HASH_SALT
- APP_URL (base URL; used for redirects)

For Google OAuth:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL (if needed)

---

## 12) Testing & Acceptance Checklist

### Must pass before launch

- [ ] Seller registers and logs in
- [ ] Seller creates profile and links
- [ ] Public profile loads by username
- [ ] Public can leave review; seller sees it
- [ ] Rate limit prevents spam
- [ ] Seller can hide review
- [ ] Search finds sellers
- [ ] Google login works
- [ ] Deployed on Vercel with online DB
- [ ] Refreshing page retains data (DB works)

---

## 13) Phase 2 Preview (Escrow planning)

When adding payments, introduce:

- transactions table:
  - id, buyerId, sellerId, amount, currency, status, createdAt
- statuses:
  created -> paid -> shipped -> delivered -> confirmed -> released
  - disputed
- dispute table:
  - transactionId, reason, evidence, decision, createdAt

Important: do not hold money in your own account; use a payments provider with marketplace-style payouts.

---

## 14) Performance & Resource Optimizations (Production Hardening)

### Analytics Cost Reduction (3× write reduction)

- Client-side sampling: Only 1/3 of profile views send analytics
- Session-based deduplication: Max 1 view per session per day
- Server-side upsert: Batch updates instead of individual inserts
- **Result**: 3× reduction in analytics database writes

### Query Optimization

- **Bundle Endpoint** (`GET /api/profile/:username/bundle`):
  - 4 parallel DB queries (profile, links, reviews, stats)
  - Eliminates 3-request waterfall
  - Supports pagination: limit (1-100, default 50) + cursor-based
  - **Before**: 3 round-trip requests
  - **After**: 1 request with 4 parallel queries

- **Bulk Link Reorder** (`PATCH /api/me/links/reorder`):
  - Atomic CASE WHEN update (single PATCH vs N individual UPDATEs)
  - **Before**: N PATCH calls for N links
  - **After**: 1 PATCH call

- **Optimistic Cache Updates**:
  - Use `setQueryData()` instead of `invalidateQueries()`
  - Instant UI feedback without refetch
  - Applies to profile/theme updates

### Resource Limits (Prevent DoS/Exhaustion)

**Pagination Defaults**:

- `GET /api/profile/:username/bundle?limit=:limit&cursor=:cursor`
  - Default limit: 50 reviews
  - Max limit: 100 reviews
  - Cursor-based pagination using review ID
  - Response includes `nextCursor` if more results exist

- `GET /api/admin/reviews?limit=:limit&cursor=:cursor`
  - Default limit: 100 reviews
  - Max limit: 500 reviews
  - Cursor-based pagination using review ID
  - Response includes `nextCursor` if more results exist

**Implementation**:

- Parse ?limit and ?cursor query params
- Clamp limit to safe ranges [1, max]
- Fetch limit+1 rows to detect if more results exist
- Return sliced results (first limit items) + optional nextCursor
- Prevents large response payloads that could cause memory exhaustion

### Owner Tracking Exclusion

- Backend returns `isOwner` flag in profile bundle
- Frontend skips analytics tracking if `isOwner === true`
- Prevents owners' own profile views from inflating metrics

### Session Hardening (Production Security)

- `trust proxy: 1` – Trust X-Forwarded-For header from reverse proxy
- `httpOnly: true` – Prevent JavaScript cookie access
- `secure: true` – HTTPS only in production
- `maxAge: 7 days` – Automatic session expiration
- `SESSION_SECRET` validation – Throw error if missing in production
- Response body logging disabled in production

### Health Check Endpoint (`GET /api/health`)

- Returns `{ status: "ok", db: "ok" | "fail" }`
- DB connectivity check for monitoring/load balancers
- Safe for public access (no sensitive data exposed)

---

## 15) Copilot Work Style (IMPORTANT)

For each task, Copilot should produce:

1. The list of files to modify/create
2. Exact code changes (not pseudocode)
3. Zod validation for request bodies
4. DB queries using Drizzle
5. Endpoint wiring and response shapes
6. Frontend wiring (call endpoint + update UI state)
7. Minimal error handling (toast + fallback UI)
8. Update types/interfaces

---

## 16) Immediate Next Tasks (Start Here)

Task 1: Create Neon DB + set DATABASE_URL locally + verify connection
Task 2: Expand Drizzle schema with profiles/links/reviews/users updates
Task 3: Implement /api/profile/:username and wire profile page
Task 4: Implement /api/auth/login + /api/me and wire dashboard auth
