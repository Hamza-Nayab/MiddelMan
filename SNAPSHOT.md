# PROJECT REFERENCE SNAPSHOT - MiddelMen

**Generated:** February 23, 2026  
**Project:** MiddelMen - Trust + Reputation + Escrow Layer for Social-Commerce Sellers  
**Version:** Phase 1 (Reputation MVP + Analytics)

---

# 1) Repo Overview

MiddelMen is a **trust infrastructure platform for Instagram/Facebook/WhatsApp sellers**. It enables small independent sellers to build a public trust profile where buyers can verify seller identity, view ratings + reviews, and feel safe paying. The platform currently implements Phase 1 (Reputation MVP): seller onboarding, public profiles with reviews, and review anti-spam controls. Future phases will add escrow payments, dispute resolution, and monetization.

**Tech Stack:**

- **Frontend:** React + Vite, React Hook Form + Zod, TanStack Query, Radix UI components, Tailwind CSS
- **Backend:** Express.js, Passport.js (local + Google OAuth), express-session with PostgreSQL store
- **Database/ORM:** PostgreSQL (Neon recommended), Drizzle ORM
- **Authentication:** Cookie-based sessions, Passport.js, Google OAuth 2.0
- **Image Processing:** Sharp (WebP conversion), Multer (multipart uploads), Canvas API (client-side compression)
- **Object Storage:** Cloudflare R2 (S3-compatible), @aws-sdk/client-s3
- **Build Tools:** Vite (dev), TypeScript, ESLint (configured), tsx (runtime)

---

# 2) Folder / File Tree

```
/Users/hamzanayab/Desktop/TT/Trusthread/
├── client/                              # React frontend
│   ├── index.html                       # Entry point
│   ├── public/                          # Static assets
│   └── src/
│       ├── main.tsx                     # React app entry
│       ├── App.tsx                      # Main app component with routing
│       ├── index.css                    # Global styles
│       ├── assets/                      # Platform icons, avatars
│       │   ├── preset-avatars/          # Local preset avatars (15 SVGs)
│       │   └── platform-icons/          # Social platform icons
│       ├── components/
│       │   ├── layout.tsx               # Main layout wrapper
│       │   ├── ProfilePreviewPhone.tsx  # Lightweight dashboard preview (no iframe)
│       │   └── ui/                      # Radix UI + Tailwind components
│       ├── hooks/
│       │   ├── use-mobile.tsx           # Mobile responsive hook
│       │   └── use-toast.ts             # Toast notifications
│       ├── lib/
│       │   ├── api.ts                   # API client + types (all endpoints)
│       │   ├── avatar.ts                # Canvas compression utility
│       │   ├── graphics.ts              # Avatar options, platform icons
│       │   ├── preset-avatars.ts         # Local preset avatar URLs
│       │   ├── queryClient.ts           # TanStack Query setup
│       │   └── utils.ts                 # Utility functions
│       └── pages/                       # Route pages
│           ├── auth.tsx                 # Register/Login form
│           ├── dashboard.tsx            # Seller dashboard (protected)
│           ├── profile.tsx              # Public seller profile page
│           ├── search.tsx               # Search sellers
│           ├── my-reviews.tsx           # View reviews given by current user
│           ├── admin.tsx                # Admin panel
│           ├── onboarding-role.tsx      # Role selection after signup
│           ├── home.tsx                 # Landing page
│           ├── demo.tsx                 # Demo page
│           └── not-found.tsx            # 404 page
│
├── server/                              # Express backend
│   ├── index.ts                         # App initialization + middleware setup
│   ├── routes.ts                        # All API endpoints (1350 lines)
│   ├── auth.ts                          # Passport.js configuration + auth handlers
│   ├── db.ts                            # Drizzle ORM initialization
│   ├── user-helpers.ts                  # generateUniqueUsername utility
│   ├── r2.ts                            # Cloudflare R2 client + upload utilities
│   ├── storage.ts                       # (legacy - likely unused)
│   ├── vite.ts                          # Vite dev server setup
│   └── static.ts                        # Static file serving
│
├── shared/                              # Shared types & database
│   └── schema.ts                        # Drizzle ORM schema + Zod types
│
├── script/
│   ├── build.ts                         # Production build script
│   ├── seed_analytics.js                # Local analytics seed utility
│   └── smoke-test.ts                    # Smoke tests
│
├── dev/
│   ├── ROADMAP.md                       # Product roadmap (Phase 0-4)
│   ├── implementation.md                # Implementation plan
│   └── API_SPEC.md                      # API specification
│
├── Configuration Files
│   ├── package.json                     # Dependencies + scripts
│   ├── tsconfig.json                    # TypeScript config
│   ├── vite.config.ts                   # Vite config (frontend build)
│   ├── drizzle.config.ts                # Drizzle migrations config
│   ├── postcss.config.js                # PostCSS + Tailwind
│   ├── components.json                  # shadcn/ui config
│   └── vite-plugin-meta-images.ts       # Custom Vite plugin
│
└── Documentation
    ├── AVATAR_UPLOAD_GUIDE.md           # Complete avatar upload implementation
    ├── AVATAR_IMPLEMENTATION_SUMMARY.md # Avatar feature summary
    ├── AVATAR_QUICKSTART.md             # Avatar quick start
    ├── AVATAR_API_REFERENCE.md          # Avatar API documentation
    ├── README_AVATAR_IMPLEMENTATION.md  # Avatar overview
    └── IMPLEMENTATION_CHECKLIST.md      # Avatar implementation checklist
```

**Key Files Highlighted:**

- **`server/routes.ts`** - All API endpoints (auth, profiles, links, reviews, admin, analytics, avatar uploads)
- **`shared/schema.ts`** - Database schema: users, profiles, links, reviews, profile_daily_stats, admin_audit_logs, review_disputes
- **`client/src/lib/api.ts`** - Centralized API client with analytics and onboarding APIs
- **`client/src/pages/dashboard.tsx`** - Seller dashboard, analytics charts, profile editor
- **`client/src/components/ProfilePreviewPhone.tsx`** - Lightweight phone preview (no iframe)
- **`client/src/pages/profile.tsx`** - Public seller profile display with reviews and click tracking
- **`server/auth.ts`** - Passport.js setup, Google OAuth, session serialization
- **`server/r2.ts`** - Cloudflare R2 integration for avatar uploads
- **`client/src/lib/avatar.ts`** - Client-side avatar compression utility
- **`client/src/pages/disabled.tsx`** - Disabled account page
- **`bootstrap_master_admin.js`** - Master admin bootstrap script

---

# 3) Runtime Architecture

## Request Flow (Frontend → API → Database)

```
User Action (e.g., upload avatar)
    ↓
React Component (e.g., dashboard.tsx)
    ↓
Canvas compression (client/src/lib/avatar.ts)
    ↓
API Client call (client/src/lib/api.ts → uploadAvatar)
    ↓
Fetch to /api/me/avatar (multipart/form-data, credentials: include)
    ↓
Express Middleware Stack:
  - express.json() (parse JSON)
  - express.urlencoded() (parse form data)
  - session middleware (verify cookie)
  - passport.initialize() + passport.session()
  - Multer (parse multipart, validate file)
    ↓
Route Handler (server/routes.ts)
  - requireAuth() check (verify req.session.userId)
  - Sharp image processing (256x256, WebP, quality 80)
  - uploadAvatarToR2() (server/r2.ts)
    ↓
Drizzle ORM Query (db.update())
  - UPDATE profiles SET avatarUrl WHERE userId = ...
    ↓
PostgreSQL Database (Neon)
    ↓
Response: { ok: true, data: { avatarUrl: "..." } }
    ↓
React state update + toast notification + refetch queries
```

## Authentication Flow

**Session-Based (Cookies):**

1. User logs in via `/api/auth/login` or Google OAuth `/api/auth/google`
2. Passport.js serializes User ID → `req.session.userId`
3. Session stored in PostgreSQL (connect-pg-simple in production, MemoryStore in dev)
4. Browser receives `Set-Cookie: connect.sid=...` (httpOnly, sameSite=lax, secure in prod)
5. All subsequent requests include cookie automatically
6. Passport deserializes user from session on each request
7. `requireAuth(userId)` middleware checks `req.session.userId` exists

**Middleware Stack (server/index.ts):**

```
express.json()
  ↓
express.urlencoded()
  ↓
express-session (store: Postgres/Memory, secret: SESSION_SECRET)
  ↓
passport.initialize()
  ↓
passport.session()
  ↓
Route handlers (access req.session.userId)
```

**Google OAuth Flow:**

1. User clicks "Sign in with Google" → `/api/auth/google` (Passport redirect)
2. User authorizes on Google
3. Google redirects to `/api/auth/google/callback`
4. Passport verifies ID token
5. If user doesn't exist in DB, create with `generateUniqueUsername(profile.name)`
6. If new user, redirect to `/onboarding/role` (choose seller/user)
7. Otherwise redirect to `/dashboard` or `/my-reviews`

## Environment Variables Loaded

**Server-side (server/index.ts, server/auth.ts, server/r2.ts):**

- `DATABASE_URL` - PostgreSQL connection string (Drizzle ORM)
- `SESSION_SECRET` - Cookie encryption key (warn if missing in production)
- `NODE_ENV` - "development" or "production" (determines store type)
- `GOOGLE_CLIENT_ID` - Google OAuth app credentials
- `GOOGLE_SECRET` - Google OAuth app credentials
- `GOOGLE_CALLBACK_URL` - OAuth redirect URL (defaults to `${APP_URL}/api/auth/google/callback`)
- `APP_URL` - Application base URL (for redirects)
- `R2_ACCOUNT_ID` - Cloudflare R2 account
- `R2_ACCESS_KEY_ID` - R2 API credentials
- `R2_SECRET_ACCESS_KEY` - R2 API credentials
- `R2_BUCKET` - R2 bucket name (must be set: "trust")
- `R2_ENDPOINT` - R2 endpoint URL
- `R2_PUBLIC_BASE_URL` - Public R2 URL for serving files

**Client-side:**

- None (frontend is typically public, secrets kept on server)

**Port Configuration:**

- Server: `process.env.PORT || 5005` (default: 5005). Local dev often uses `PORT=5010`.
- Client (Vite): `--port 5000` for `dev:client` (optional)

---

# 4) API Inventory (Current State)

## API Endpoints Summary

| Method | Path                              | Auth    | Status | Notes                                |
| ------ | --------------------------------- | ------- | ------ | ------------------------------------ |
| POST   | /api/auth/register                | No      | ✅     | Register new user                    |
| POST   | /api/auth/login                   | No      | ✅     | Login with email/username            |
| POST   | /api/auth/logout                  | Yes     | ✅     | Logout (clear session)               |
| GET    | /api/auth/google                  | No      | ✅     | Google OAuth start                   |
| GET    | /api/auth/google/callback         | No      | ✅     | Google OAuth callback                |
| GET    | /api/username/check               | No      | ✅     | Check username availability          |
| GET    | /api/me                           | Yes     | ✅     | Get current user + profile           |
| PATCH  | /api/me/profile                   | Yes     | ✅     | Update profile fields                |
| PATCH  | /api/me/onboarding                | Yes     | ✅     | Complete seller onboarding           |
| PATCH  | /api/me/role                      | Yes     | ✅     | Change role (buyer→seller)           |
| PATCH  | /api/me/username                  | Yes     | ✅     | Change seller username               |
| POST   | /api/me/avatar                    | Yes     | ✅     | Upload avatar (Multer + Sharp)       |
| GET    | /api/me/links                     | Yes     | ✅     | Get user's links                     |
| POST   | /api/me/links                     | Yes     | ✅     | Create new link                      |
| PATCH  | /api/me/links/:id                 | Yes     | ✅     | Update link                          |
| DELETE | /api/me/links/:id                 | Yes     | ✅     | Delete link                          |
| GET    | /api/me/reviews                   | Yes     | ✅     | Get reviews of current seller        |
| GET    | /api/me/reviews/given             | Yes     | ✅     | Get reviews authored by current user |
| PATCH  | /api/me/reviews/given/:id         | Yes     | ✅     | Update review authored by user       |
| PATCH  | /api/me/reviews/:id/toggle-hidden | Yes     | ✅     | Seller hides review                  |
| GET    | /api/me/analytics                 | Yes     | ✅     | 14-day visits/clicks series          |
| GET    | /api/profile/:username            | No      | ✅     | Get public seller profile            |
| GET    | /api/profile/:userId/links        | No      | ✅     | Get seller's links                   |
| GET    | /api/profile/:userId/reviews      | No      | ✅     | Get seller's reviews + stats         |
| POST   | /api/profile/:userId/reviews      | No      | ✅     | Submit review for seller             |
| POST   | /api/profile/:userId/click        | No      | ✅     | Record link click                    |
| GET    | /api/search                       | No      | ✅     | Search sellers by username/name      |
| GET    | /api/admin/reviews                | Yes\*   | ✅     | List all reviews (admin only)        |
| PATCH  | /api/admin/reviews/:id/hide       | Yes\*   | ✅     | Admin hide/unhide review             |
| GET    | /api/admin/users                  | Yes\*   | ✅     | List/search users (admin only)       |
| PATCH  | /api/admin/users/:id/disable      | Yes\*   | ✅     | Disable user account (admin only)    |
| PATCH  | /api/admin/users/:id/enable       | Yes\*   | ✅     | Enable user account (admin only)     |
| PATCH  | /api/admin/users/:id/role         | Yes\*\* | ✅     | Admin set user role (master only)    |

**Auth Legend:**

- `Yes` = Requires `req.session.userId`
- `Yes*` = Requires `req.session.userId` + Admin role verification
- `Yes**` = Requires `req.session.userId` + Master Admin role verification
- `No` = Public endpoint

---

## Endpoint Details

### POST /api/auth/register

**Handler:** `server/routes.ts` line 552  
**Function:** `registerSchema` validation + new user creation  
**Request:**

```json
{
  "displayName": "John Seller",
  "email": "seller@example.com",
  "password": "securepass123",
  "confirmPassword": "securepass123",
  "role": "seller",
  "username": "johnseller"
}
```

**Response (201):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johnseller",
      "role": "seller",
      "createdAt": "2026-02-22T01:32:00Z"
    }
  }
}
```

**Errors:**

- `400 VALIDATION_ERROR` - Invalid input
- `409 CONFLICT` - Email already exists
- `200 BcryptHashFail` - Bcrypt hashing failed

**Key Logic:**

- Hash password with bcryptjs
- Sellers must provide a unique `username`
- Buyers get a generated placeholder username
- Create user + create profile (sellers may have null avatarUrl until onboarding)

---

### POST /api/auth/login

**Handler:** `server/routes.ts` line 607  
**Function:** Passport local strategy or manual check  
**Request:**

```json
{
  "usernameOrEmail": "johnseller@example.com",
  "password": "securepass123"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johnseller",
      "role": "seller",
      "createdAt": "2026-02-22T01:32:00Z"
    }
  }
}
```

**Errors:**

- `401 UNAUTHORIZED` - Invalid credentials

**Special:** Sets `req.session.userId = user.id` (session persists via cookie)

---

### GET /api/me

**Handler:** `server/routes.ts` line 803  
**Auth:** Yes (checks `requireAuth(req.session.userId)`)  
**Response (200):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johnseller",
      "role": "seller",
      "createdAt": "2026-02-22T01:32:00Z"
    },
    "profile": {
      "userId": 1,
      "displayName": "John's Bakery",
      "bio": "Fresh baked goods daily",
      "avatarUrl": "https://bucket.r2.dev/avatars/1.webp?v=1708580400000",
      "instagramHandle": "johnsbakery",
      "whatsappNumber": "+1234567890",
      "phoneNumber": "1234567890",
      "countryCode": "US",
      "isVerified": true,
      "verificationMethod": "whatsapp_otp",
      "theme": "light",
      "createdAt": "2026-02-22T01:32:00Z",
      "updatedAt": "2026-02-22T01:32:00Z"
    }
  }
}
```

**Errors:**

- `401 UNAUTHORIZED` - No session

---

### PATCH /api/me/profile

**Handler:** `server/routes.ts` line 849  
**Auth:** Yes  
**Request:** (all fields optional)

```json
{
  "displayName": "John's Premium Bakery",
  "bio": "Fresh organic baked goods",
  "avatarUrl": "https://...",
  "instagramHandle": "johnsbakery_official",
  "phoneNumber": "9876543210",
  "countryCode": "CA",
  "theme": "dark"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "profile": {
      /* updated profile object */
    }
  }
}
```

**Validation:** Zod `profileUpdateSchema` (min 2 chars displayName, max 160 chars bio, etc.)  
**Errors:**

- `400 VALIDATION_ERROR` - Invalid input
- `401 UNAUTHORIZED` - No session

---

### PATCH /api/me/onboarding

**Handler:** `server/routes.ts` line ~900  
**Auth:** Yes  
**Purpose:** Complete seller onboarding (avatar + bio + displayName).

**Request:**

```json
{
  "displayName": "John's Bakery",
  "avatarUrl": "https://...",
  "bio": "Fresh baked goods daily"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "user": { "id": 1, "username": "johnseller", "role": "seller" },
    "profile": {
      "displayName": "John's Bakery",
      "avatarUrl": "https://...",
      "bio": "..."
    }
  }
}
```

---

### GET /api/me/analytics

**Handler:** `server/routes.ts` line ~1270  
**Auth:** Yes (seller only)  
**Query:** `?days=1..30`  
**Purpose:** Return daily rollups of views and clicks.

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "days": [{ "day": "2026-02-10", "views": 120, "clicks": 45 }]
  }
}
```

---

### POST /api/me/avatar

**Handler:** `server/routes.ts` line 665  
**Auth:** Yes  
**Middleware:** Multer memory storage, file size validation (5MB)  
**Request:** `multipart/form-data` with field `avatar` (File)  
**Processing:**

1. Multer validates MIME type (image/jpeg, image/png, image/webp)
2. Sharp resizes to 256x256 with cover crop
3. Converts to WebP with quality 80
4. Uploads to R2 at key `avatars/{userId}.webp`
5. Updates DB `profiles.avatarUrl` with public URL + version param

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "avatarUrl": "https://bucket.r2.dev/avatars/1.webp?v=1708580400000"
  }
}
```

**Errors:**

- `400 VALIDATION_ERROR` - Invalid file type, missing file, or size > 5MB
- `401 UNAUTHORIZED` - No session
- `500 R2_UPLOAD_FAILED` - Cloudflare R2 error
- `500 UPLOAD_ERROR` - Sharp processing failed

**Special Logic:**

- Client-side compression via Canvas API (compressAvatar)
- Server reprocesses regardless (no trusting client)
- Cache headers on R2: 1-year immutable
- Version param for cache busting

---

### GET /api/me/links

**Handler:** `server/routes.ts` line 916  
**Auth:** Yes  
**Response (200):**

```json
{
  "ok": true,
  "data": {
    "links": [
      {
        "id": 1,
        "userId": 1,
        "icon": "instagram",
        "title": "My Instagram",
        "url": "https://instagram.com/johnsbakery",
        "isActive": true,
        "sortOrder": 0,
        "createdAt": "2026-02-22T01:32:00Z",
        "updatedAt": "2026-02-22T01:32:00Z"
      }
    ]
  }
}
```

---

### POST /api/me/links

**Handler:** `server/routes.ts` line 1040  
**Auth:** Yes  
**Request:**

```json
{
  "icon": "website",
  "title": "My Online Store",
  "url": "https://example.com/store"
}
```

**Validation:** `linkCreateSchema` (icon from enum, title 1-40 chars, URL must start with https://)  
**Response (200):**

```json
{
  "ok": true,
  "data": {
    "link": {
      /* newly created link object */
    }
  }
}
```

---

### PATCH /api/me/links/:id

**Handler:** `server/routes.ts` line 1078  
**Auth:** Yes  
**Request:** (all optional)

```json
{
  "icon": "linkedin",
  "title": "Connect on LinkedIn",
  "url": "https://linkedin.com/in/johnsmith",
  "isActive": true,
  "sortOrder": 1
}
```

**Special:** If `sortOrder` is provided, all links are reordered

---

### DELETE /api/me/links/:id

**Handler:** `server/routes.ts` line 1132  
**Auth:** Yes  
**Response (200):**

```json
{
  "ok": true,
  "data": { "deleted": true }
}
```

---

### POST /api/profile/:userId/reviews

**Handler:** `server/routes.ts` line 377  
**Auth:** No (public)  
**Anti-spam:** Checks IP hash + user agent hash + reviewer user ID (if logged in) to limit 1 review per day  
**Request:**

```json
{
  "rating": 5,
  "comment": "Amazing products! Would buy again."
}
```

**Validation:** `reviewCreateSchema` (rating 1-5, comment 1-500 chars)  
**Response (201):**

```json
{
  "ok": true,
  "data": {
    "review": {
      "id": 42,
      "sellerId": 1,
      "reviewerUserId": null,
      "authorName": "Anonymous Buyer",
      "rating": 5,
      "comment": "Amazing products! Would buy again.",
      "isHidden": false,
      "createdAt": "2026-02-22T01:32:00Z"
    }
  }
}
```

**Errors:**

- `400 SPAM_LIMIT` - User already reviewed this seller within 24h
- `400 VALIDATION_ERROR` - Invalid rating/comment

---

### POST /api/profile/:userId/click

**Handler:** `server/routes.ts` line ~340  
**Auth:** No (public)  
**Purpose:** Record a link click in daily analytics.

**Response (200):**

```json
{ "ok": true, "data": { "recorded": true } }
```

---

### GET /api/profile/:username

**Handler:** `server/routes.ts` line 272  
**Auth:** No (public)  
**Response (200):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johnseller",
      "role": "seller",
      "createdAt": "2026-02-22T01:32:00Z"
    },
    "profile": {
      /* public profile data */
    },
    "stats": {
      "avgRating": 4.8,
      "totalReviews": 24
    }
  }
}
```

**Errors:**

- `404 PROFILE_NOT_FOUND` - Username not found or user is not a seller

**Note:** Creates auto-profile if missing

---

### GET /api/search

**Handler:** `server/routes.ts` line 487  
**Auth:** No (public)  
**Query Params:** `query=johnseller`  
**Response (200):**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "user": {
          /* user object */
        },
        "profile": {
          /* profile object */
        },
        "stats": { "avgRating": 4.8, "totalReviews": 24 }
      }
    ]
  }
}
```

**Search Logic:** Case-insensitive ILIKE on username or displayName

---

### GET /api/admin/reviews

**Handler:** `server/routes.ts` line 1257 (inferred from pattern)  
**Auth:** Yes (admin only - `requireAdmin()`)  
**Query Params:** `?sellerId=1&hidden=true`  
**Filters reviews by seller and hidden status**

---

### PATCH /api/admin/reviews/:id/hide

**Handler:** `server/routes.ts` line 1257  
**Auth:** Yes (admin only)  
**Request:**

```json
{ "isHidden": true }
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "review": {
      /* updated review */
    }
  }
}
```

---

### PATCH /api/admin/users/:id/role

**Handler:** `server/routes.ts` line 1300  
**Auth:** Yes (admin only)  
**Request:**

```json
{ "role": "seller" }
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "user": {
      /* updated user */
    }
  }
}
```

---

# 5) Database / Drizzle Schema Inventory

**Database:** PostgreSQL (Neon recommended)  
**ORM:** Drizzle ORM  
**Schema Location:** `shared/schema.ts`

---

## Table: `users`

**Columns:**

- `id` (serial, PRIMARY KEY) - User ID
- `username` (varchar 20, UNIQUE) - Display username
- `email` (text, UNIQUE) - Email address
- `passwordHash` (text) - Bcrypt hashed password
- `googleId` (text, UNIQUE) - Google OAuth ID (null if local auth)
- `role` (enum: buyer|seller|admin, default=buyer) - User role
- `lastUsernameChangedAt` (timestamp with timezone, nullable) - Username change cooldown tracking
- `isDisabled` (boolean, default=false) - Account disabled flag
- `disabledReason` (text, nullable) - Why account was disabled
- `disabledAt` (timestamp with timezone, nullable) - When account was disabled
- `disabledByAdminId` (integer, nullable, FK→users.id) - Admin who disabled account
- `isMasterAdmin` (boolean, default=false) - Master admin flag (can manage admins)
- `createdAt` (timestamp with timezone) - Account creation time
- `updatedAt` (timestamp with timezone) - Last updated time

**Indexes:**

- PRIMARY KEY on `id`
- UNIQUE on `username`
- UNIQUE on `email`
- `users_username_lower_idx` - Functional index on `lower(username)` for case-insensitive lookups

**Queries:**

- `INSERT INTO users` - in `/api/auth/register`
- `SELECT FROM users WHERE username = ...` - in generateUniqueUsername, `/api/auth/login`
- `SELECT FROM users WHERE lower(username) = lower(...)` - case-insensitive lookup
- `SELECT FROM users WHERE id = ...` - in passport deserializeUser
- `UPDATE users SET role = ...` - in `/api/me/role`, `/api/admin/users/:id/role`
- `UPDATE users SET username = ...` - in `/api/me/username`
- `UPDATE users SET isDisabled = true, disabledReason = ..., disabledAt = ..., disabledByAdminId = ...` - disable account
- `UPDATE users SET isDisabled = false, disabledReason = NULL, disabledAt = NULL, disabledByAdminId = NULL` - enable account

---

## Table: `profiles`

**Columns:**

- `userId` (integer, NOT NULL, UNIQUE, FK→users.id, onDelete=cascade) - Foreign key to users
- `displayName` (varchar 50, NOT NULL) - Public display name
- `bio` (varchar 160, nullable) - Short bio
- `avatarUrl` (text, nullable) - URL to avatar image (R2 or custom)
- `instagramHandle` (varchar 30, UNIQUE, nullable) - Instagram handle
- `whatsappNumber` (varchar 20, nullable) - WhatsApp number
- `phoneNumber` (varchar 20, nullable) - Phone number
- `countryCode` (varchar 2, default='US', nullable) - Country code
- `isVerified` (boolean, default=false) - Verification status
- `verificationMethod` (enum: none|ig_bio_code|whatsapp_otp|manual, default='none') - Verification method
- `theme` (enum: light|dark|gradient, default='light') - Profile theme
- `createdAt` (timestamp with timezone) - Profile creation
- `updatedAt` (timestamp with timezone) - Last updated

**Queries:**

- `INSERT INTO profiles` - created in `/api/auth/register` (sellers may have null avatarUrl until onboarding)
- `SELECT FROM profiles WHERE userId = ...` - in `/api/me`, `/api/profile/:username`
- `UPDATE profiles SET ...` - in `/api/me/profile`, `/api/me/avatar`

---

## Table: `links`

**Columns:**

- `id` (serial, PRIMARY KEY) - Link ID
- `userId` (integer, NOT NULL, FK→users.id, onDelete=cascade) - Owner user
- `icon` (varchar 30, nullable) - Platform icon name (website, instagram, linkedin, etc.)
- `title` (varchar 40, NOT NULL) - Link title
- `url` (text, NOT NULL) - URL (must start with https://)
- `isActive` (boolean, default=true) - Is link visible?
- `sortOrder` (integer, default=0) - Display order
- `createdAt` (timestamp with timezone) - Created
- `updatedAt` (timestamp with timezone) - Updated

**Indexes:**

- PRIMARY KEY on `id`

**Queries:**

- `INSERT INTO links` - in `/api/me/links`
- `SELECT FROM links WHERE userId = ... ORDER BY sortOrder` - in `/api/me/links`, `/api/profile/:userId/links`
- `UPDATE links SET ...` - in `/api/me/links/:id` (reorders if sortOrder changes)
- `DELETE FROM links` - in `/api/me/links/:id`

---

## Table: `reviews`

**Columns:**

- `id` (serial, PRIMARY KEY) - Review ID
- `sellerId` (integer, NOT NULL, FK→users.id, onDelete=cascade) - Seller being reviewed
- `reviewerUserId` (integer, nullable, FK→users.id, onDelete=set null) - Reviewer user (null if anonymous)
- `authorName` (varchar 50, NOT NULL) - Reviewer display name
- `rating` (integer, NOT NULL) - Rating 1-5
- `comment` (text, NOT NULL) - Review text
- `isHidden` (boolean, default=false) - Hidden by seller/admin?
- `ipHash` (text, nullable) - SHA256 hash of reviewer IP (for spam detection)
- `userAgentHash` (text, nullable) - SHA256 hash of user agent (for spam detection)
- `createdAt` (timestamp with timezone) - Posted at

**Indexes:**

- `reviews_seller_created_idx` - on (sellerId, createdAt) - for stats queries
- `reviews_reviewer_created_idx` - on (reviewerUserId, createdAt) - for "my reviews" queries
- `reviews_ip_seller_created_idx` - on (ipHash, sellerId, createdAt) - for spam detection

**Queries:**

- `INSERT INTO reviews` - in `/api/profile/:userId/reviews`
- `SELECT FROM reviews WHERE sellerId = ... AND isHidden = false` - in `/api/profile/:userId/reviews`
- `UPDATE reviews SET isHidden = true` - in `/api/me/reviews/:id/toggle-hidden`, `/api/admin/reviews/:id/hide`
- `SELECT COUNT(*), AVG(rating) FROM reviews WHERE sellerId = ...` - for stats

---

## Table: `profile_daily_stats`

**Purpose:** Low-cost analytics for profile views and link clicks (daily rollups).

**Columns:**

- `userId` (integer, FK→users.id, onDelete=cascade)
- `day` (date, NOT NULL)
- `views` (integer, default=0)
- `clicks` (integer, default=0)
- `updatedAt` (timestamp with timezone)

**Indexes:**

- PRIMARY KEY on (`userId`, `day`)
- `profile_daily_stats_user_day_idx` on (`userId`, `day`)

**Queries:**

- `INSERT ... ON CONFLICT DO UPDATE` - in `/api/profile/:username` (views, when track=1)
- `INSERT ... ON CONFLICT DO UPDATE` - in `/api/profile/:userId/click` (clicks)
- `SELECT ... WHERE userId = ... AND day >= ...` - in `/api/me/analytics`

---

## Table: `admin_audit_logs`

**Purpose:** Track all admin actions for compliance and debugging.

**Columns:**

- `id` (serial, PRIMARY KEY) - Log entry ID
- `adminId` (integer, NOT NULL, FK→users.id) - Admin who performed action
- `action` (enum: adminActionEnum) - Action type performed
- `targetUserId` (integer, nullable, FK→users.id) - User affected by action
- `targetReviewId` (integer, nullable, FK→reviews.id) - Review affected by action
- `metadata` (jsonb, nullable) - Additional context (reason, old values, etc.)
- `createdAt` (timestamp with timezone) - When action was performed

**Indexes:**

- PRIMARY KEY on `id`
- `admin_audit_logs_admin_created_idx` on (`adminId`, `createdAt`)

**Action Types:**

- `disable_user` - Account disabled
- `enable_user` - Account re-enabled
- `hide_review` - Review hidden by admin
- `unhide_review` - Review unhidden by admin
- `change_role` - User role changed
- `promote_admin` - User promoted to admin
- `demote_admin` - Admin demoted to regular user

**Queries:**

- `INSERT INTO admin_audit_logs` - on every admin action
- `SELECT FROM admin_audit_logs WHERE adminId = ...` - audit trail for specific admin
- `SELECT FROM admin_audit_logs WHERE targetUserId = ...` - history for specific user

---

## Table: `review_disputes`

**Purpose:** Allow sellers to dispute unfair reviews (future feature).

**Columns:**

- `id` (serial, PRIMARY KEY) - Dispute ID
- `reviewId` (integer, NOT NULL, FK→reviews.id, onDelete=cascade) - Disputed review
- `sellerId` (integer, NOT NULL, FK→users.id) - Seller filing dispute
- `reason` (text, NOT NULL) - Why seller is disputing
- `status` (enum: disputeStatusEnum, default='pending') - Dispute status
- `resolvedByAdminId` (integer, nullable, FK→users.id) - Admin who resolved
- `resolution` (text, nullable) - Admin's resolution notes
- `createdAt` (timestamp with timezone) - Dispute filed at
- `resolvedAt` (timestamp with timezone, nullable) - When resolved

**Indexes:**

- PRIMARY KEY on `id`
- `review_disputes_status_created_idx` on (`status`, `createdAt`)

**Status Types:**

- `pending` - Awaiting admin review
- `under_review` - Admin is reviewing
- `approved` - Dispute approved, review may be hidden
- `rejected` - Dispute rejected, review remains

**Queries:**

- `INSERT INTO review_disputes` - seller files dispute
- `SELECT FROM review_disputes WHERE status = 'pending'` - admin queue
- `UPDATE review_disputes SET status = ..., resolvedByAdminId = ...` - admin resolution

---

## Enums (PostgreSQL)

```sql
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE verification_method AS ENUM ('none', 'ig_bio_code', 'whatsapp_otp', 'manual');
CREATE TYPE profile_theme AS ENUM ('light', 'dark', 'gradient');
CREATE TYPE admin_action_enum AS ENUM ('disable_user', 'enable_user', 'hide_review', 'unhide_review', 'change_role', 'promote_admin', 'demote_admin');
CREATE TYPE dispute_status_enum AS ENUM ('pending', 'under_review', 'approved', 'rejected');
```

---

# 6) Core Modules & Functions

## Server-Side Services / Query Functions

### Authentication Module (`server/auth.ts`)

**Function: `passport.serializeUser(user, done)`**

- **Location:** `server/auth.ts` line ~18
- **Purpose:** Convert User object to serializable format for session storage
- **Logic:** Extracts user.id and stores in session
- **Called by:** Passport on successful login

**Function: `passport.deserializeUser(id, done)`**

- **Location:** `server/auth.ts` line ~21
- **Purpose:** Restore User object from session ID on each request
- **Logic:** Query DB for user by ID, return user object
- **Called by:** Passport on every request with valid session

**Function: `googleAuthCallbackHandler`**

- **Location:** `server/auth.ts` (lines ~40-80)
- **Purpose:** Handle Google OAuth callback
- **Logic:**
  1. Extract email from Google profile
  2. Find or create user with `googleId`
  3. Generate unique username if new
  4. Create profile row if missing
  5. Return SessionUser object
- **Called by:** `GET /api/auth/google/callback`

---

### User Helpers (`server/user-helpers.ts`)

**Function: `generateUniqueUsername(seed: string): Promise<string>`**

- **Location:** `server/user-helpers.ts` lines 1-30
- **Purpose:** Generate a unique username from a seed string
- **Logic:**
  1. Normalize seed: lowercase, remove special chars, max 20 chars
  2. Try username without suffix, then with numeric suffixes (1, 2, 3...)
  3. Check DB for conflicts up to 100 attempts
  4. Fallback: base + timestamp suffix
- **Called by:**
  - `/api/auth/register` - from displayName
  - Google OAuth callback - from profile.name
- **Returns:** Guaranteed unique username ≤ 20 chars

---

### R2 / Image Storage (`server/r2.ts`)

**Function: `getR2Client(): S3Client`**

- **Location:** `server/r2.ts` lines 1-23
- **Purpose:** Initialize Cloudflare R2 S3 client
- **Logic:** Create S3Client with R2 endpoint + credentials from env vars
- **Called by:** `uploadAvatarToR2`
- **Throws:** Error if R2 credentials missing

**Function: `uploadAvatarToR2(userId: number, buffer: Buffer, contentType?: string): Promise<string>`**

- **Location:** `server/r2.ts` lines 25-48
- **Purpose:** Upload processed image buffer to R2
- **Logic:**
  1. Get R2 client
  2. PutObjectCommand with key `avatars/{userId}.webp`
  3. Set cache headers: `public, max-age=31536000, immutable` (1 year)
  4. Append version query param: `?v={timestamp}`
  5. Return public URL
- **Called by:** `/api/me/avatar` endpoint
- **Throws:** Error with code `R2_UPLOAD_FAILED`

---

### Route Helpers (`server/routes.ts`)

**Function: `requireAuth(userId?: number): void`**

- **Location:** `server/routes.ts` line ~137
- **Purpose:** Verify user is authenticated
- **Logic:** Throw 401 error if userId is falsy
- **Called by:** Every protected endpoint
- **Throws:** Error with status 401

**Function: `requireAdmin(userId?: number): Promise<User>`**

- **Location:** `server/routes.ts` line ~120
- **Purpose:** Verify user is admin
- **Logic:**
  1. Call `getSessionUser(userId)`
  2. Throw 401 if no user
  3. Throw 403 if user.role !== 'admin'
  4. Return user object
- **Called by:** `/api/admin/*` endpoints

**Function: `getSessionUser(userId?: number): Promise<User | null>`**

- **Location:** `server/routes.ts` line ~116
- **Purpose:** Query user by ID with role check
- **Logic:** SELECT \* FROM users WHERE id = ...
- **Called by:** `requireRole`, `requireAdmin`
- **Returns:** Full User object or null if not found

**Function: `getReviewStats(sellerId: number, includeHidden?: boolean): Promise<{ avgRating: number; totalReviews: number }>`**

- **Location:** `server/routes.ts` line ~215
- **Purpose:** Calculate review statistics for a seller
- **Logic:**
  1. Build WHERE clause: `reviews.sellerId = ... AND isHidden = false` (or include hidden if flag)
  2. Aggregate: SELECT AVG(rating), COUNT(\*) FROM reviews
- **Called by:** Any endpoint returning seller stats
- **Returns:** Aggregated stats or zeros if no reviews

---

## Client-Side API Client (`client/src/lib/api.ts`)

**Module: `api` (singleton object)**

- **Location:** `client/src/lib/api.ts` lines 170-279
- **Purpose:** Centralized API client for all server requests
- **Transport:** Fetch with `credentials: 'include'` (for cookie-based sessions)
- **Error Handling:** Wraps errors in ApiError class with code + status

**Methods (20+):**

| Method                             | HTTP   | Path                              | Returns                  |
| ---------------------------------- | ------ | --------------------------------- | ------------------------ |
| `register(payload)`                | POST   | /api/auth/register                | `{ user: User }`         |
| `login(payload)`                   | POST   | /api/auth/login                   | `{ user: User }`         |
| `logout()`                         | POST   | /api/auth/logout                  | `{ loggedOut: boolean }` |
| `checkUsername(username)`          | GET    | /api/username/check               | `UsernameCheckResponse`  |
| `getMe()`                          | GET    | /api/me                           | `MeResponse`             |
| `updateRole(role)`                 | PATCH  | /api/me/role                      | `{ user: User }`         |
| `changeUsername(username)`         | PATCH  | /api/me/username                  | `{ user: User }`         |
| `completeOnboarding(payload)`      | PATCH  | /api/me/onboarding                | `{ user, profile }`      |
| `updateProfile(payload)`           | PATCH  | /api/me/profile                   | `{ profile: Profile }`   |
| `uploadAvatar(file)`               | POST   | /api/me/avatar                    | `{ avatarUrl: string }`  |
| `getLinks()`                       | GET    | /api/me/links                     | `{ links: Link[] }`      |
| `addLink(payload)`                 | POST   | /api/me/links                     | `{ link: Link }`         |
| `updateLink(id, payload)`          | PATCH  | /api/me/links/:id                 | `{ link: Link }`         |
| `deleteLink(id)`                   | DELETE | /api/me/links/:id                 | `{ deleted: boolean }`   |
| `getPublicProfile(username)`       | GET    | /api/profile/:username            | `PublicProfileResponse`  |
| `getPublicLinks(userId)`           | GET    | /api/profile/:userId/links        | `{ links: Link[] }`      |
| `trackProfileClick(userId)`        | POST   | /api/profile/:userId/click        | `{ recorded: boolean }`  |
| `getPublicReviews(userId)`         | GET    | /api/profile/:userId/reviews      | `ReviewsResponse`        |
| `createReview(userId, payload)`    | POST   | /api/profile/:userId/reviews      | `{ review: Review }`     |
| `getOwnerReviews()`                | GET    | /api/me/reviews                   | `ReviewsResponse`        |
| `getAnalytics(days)`               | GET    | /api/me/analytics                 | `AnalyticsResponse`      |
| `getGivenReviews()`                | GET    | /api/me/reviews/given             | `GivenReviewsResponse`   |
| `updateGivenReview(id, payload)`   | PATCH  | /api/me/reviews/given/:id         | `{ review: Review }`     |
| `toggleReviewHidden(id, isHidden)` | PATCH  | /api/me/reviews/:id/toggle-hidden | `{ review: Review }`     |
| `search(query)`                    | GET    | /api/search                       | `{ results: [...] }`     |
| `adminGetReviews(params)`          | GET    | /api/admin/reviews                | `AdminReviewsResponse`   |
| `adminHideReview(id, isHidden)`    | PATCH  | /api/admin/reviews/:id/hide       | `{ review: Review }`     |
| `adminSetUserRole(id, role)`       | PATCH  | /api/admin/users/:id/role         | `{ user: User }`         |

---

## Image Processing (`client/src/lib/avatar.ts`)

**Function: `compressAvatar(file: File): Promise<File>`**

- **Location:** `client/src/lib/avatar.ts` lines 1-60
- **Purpose:** Client-side compress image to < 100KB target
- **Logic:**
  1. Read file as Data URL
  2. Load into Image element
  3. Create 256x256 canvas
  4. Calculate center crop (fit: cover)
  5. Draw image with crop to canvas
  6. Export as WebP quality 0.8
  7. Validate output < 100KB
  8. Return new File object (mime: image/webp)
- **Called by:** Dashboard avatar upload handler
- **Throws:** Error if > 100KB or image load fails
- **Returns:** New File object ready for multipart upload

---

## Validation Schemas (Zod)

All in `server/routes.ts` lines 35-115:

- `registerSchema` - displayName 2-50, email, password 8+
- `loginSchema` - usernameOrEmail 3+, password 1+
- `profileUpdateSchema` - All optional, min validations
- `linkCreateSchema` - icon enum, title 1-40, URL https://
- `linkUpdateSchema` - All optional versions above
- `reviewCreateSchema` - rating 1-5, comment 1-500

---

# 7) Frontend Pages & Data Flow

## Auth Page (`client/src/pages/auth.tsx`)

**Route:** `/auth`  
**Components:** Register tab + Login tab (with toggle)  
**Data Loading:**

- `useQuery("me")` - Check if already logged in (redirect to /dashboard or /my-reviews)

**Form Management:**

- React Hook Form + Zod (`registerSchema`, `loginSchema`)
- Submit → `api.register()` or `api.login()`

**State Management:**

- Local form state (React Hook Form)
- `isLoading` state for button feedback
- TanStack Query invalidates "me" query after login

**Error Handling:**

- Toast notifications for validation errors or server errors
- Specific error code checks (e.g., "Email already exists")

---

## Dashboard Page (`client/src/pages/dashboard.tsx`)

**Route:** `/dashboard` (protected - seller only)  
**Purpose:** Seller management hub

**Data Loading:**

- `useQuery("me")` - Get current user + profile
- `useQuery("links")` - Get seller's links
- `useQuery("owner-reviews")` - Get reviews of seller's products

**State Management:**

- React Hook Form for profile editing
- Local state: `orderedLinks`, `draggedLinkId`, `isAvatarUploading`, `customAvatarPreview`
- TanStack Query for server state (links, reviews)

**Key Features:**

1. **Profile Tab:**
   - Edit displayName, bio, avatar, Instagram handle, phone, country
   - Avatar upload with client-side compression
   - Theme selection (light/dark/gradient)
   - "Save order" button for link drag-reordering

2. **Links Tab:**
   - Drag-to-reorder links with visual feedback
   - Create new link dialog
   - Edit/delete individual links

3. **Reviews Tab:**
   - View reviews of seller's products
   - Hide/show reviews (moderation)

4. **Analytics Tab:**
   - Mock data for now (no DB tracking yet)

5. **Appearance Tab:**
   - Theme selector

**Avatar Upload Flow:**

- File input → validation (type, size)
- Call `compressAvatar(file)` → Canvas compression
- Call `api.uploadAvatar(compressedFile)` → Server
- Update profile.avatarUrl → Re-render
- Success toast

**Error Handling:**

- Toast for validation errors (file too large, wrong type)
- Toast for upload failures
- Specific R2 errors displayed to user

---

## Profile Page (`client/src/pages/profile.tsx`)

**Route:** `/:username` (public)  
**Purpose:** View seller's public profile + leave review

**Data Loading:**

- `useQuery("profile", username)` → `api.getPublicProfile(username)`
- `useQuery("links", userId)` → `api.getPublicLinks(userId)`
- `useQuery("reviews", userId)` → `api.getPublicReviews(userId)`
- `useQuery("me")` - For review form (check if logged in)

**Components:**

- Profile header with avatar, name, verified badge, stats
- Links section (drag-to-scroll, no interaction)
- Reviews section (sorted by rating/newest)
- Review submission form (if logged in) or "Sign in to review" button

**Review Form:**

- React Hook Form + Zod
- Star rating selector (1-5)
- Comment text area (max 500 chars)
- Anti-spam: Only allows 1 review per seller per day (checked on submit)

**Theme Support:**

- Light/dark/gradient themes read from profile.theme
- Tailwind CSS dark: prefix for dark mode

**Error Handling:**

- 404 if username doesn't exist or is not a seller
- Toast for review submission errors
- Redirect to /auth if clicking "Sign in to review"

---

## Search Page (`client/src/pages/search.tsx`)

**Route:** `/search`  
**Purpose:** Search sellers

**Data Loading:**

- `useQuery("search", query)` → `api.search(query)` (triggered on input change with debounce)

**Features:**

- Input field with real-time search
- Results displayed as seller cards (name, avatar, stats, rating)
- Click to navigate to profile

---

## My Reviews Page (`client/src/pages/my-reviews.tsx`)

**Route:** `/my-reviews` (protected)  
**Purpose:** View reviews given by current user

**Data Loading:**

- `useQuery("given-reviews")` → `api.getGivenReviews()`

**Features:**

- List of reviews with seller info
- Edit/delete reviews
- Filter options (optional)

---

## Admin Page (`client/src/pages/admin.tsx`)

**Route:** `/admin` (admin only)  
**Purpose:** Admin controls

**Data Loading:**

- `useQuery("admin-reviews")` → `api.adminGetReviews()`
- `useQuery("admin-users")` (if implemented)

**Features:**

- Review moderation (list, hide/show)
- User role management (set buyer/seller/admin)
- Verification approvals (if implemented)

---

# 8) Shared Types / Contracts

## Response Wrapper

**Success Response:**

```typescript
type ApiSuccess<T> = { ok: true; data: T };
```

**Failure Response:**

```typescript
type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

**All API responses use this:** `ApiSuccess<T> | ApiFailure`

---

## User-Related Types

```typescript
export type User = {
  id: number;
  username: string | null;
  role: "buyer" | "seller" | "admin";
  createdAt: string;
};

export type Profile = {
  userId: number;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  whatsappNumber: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  isVerified: boolean;
  verificationMethod: "none" | "ig_bio_code" | "whatsapp_otp" | "manual";
  theme: "light" | "dark" | "gradient";
  createdAt: string;
  updatedAt: string;
};

export type MeResponse = {
  user: User | null;
  profile: Profile | null;
};
```

---

## Link & Review Types

```typescript
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
  stats: { avgRating: number; totalReviews: number };
};
```

---

## Error Class

```typescript
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
  ) { ... }
}
```

---

# 9) Known Gaps / TODOs Found in Code

## Missing Endpoints vs. API_SPEC

- **Phase 1.5 Features (Not yet implemented):**
  - WhatsApp OTP verification endpoint
  - Instagram handle verification endpoint
  - Seller report/flag endpoint
  - Review images upload
  - Seller response to review
  - Profanity filter on reviews
  - Review sorting options (newest/highest)

- **Admin Panel Features (Partial):**
  - Admin dashboard UI exists but minimal
  - User list/admin management (basic)
  - Verification request approval UI

---

## Security Notes / Risks

1. **IP Hashing for Spam:**
   - Code hashes IP addresses (SHA256)
   - However, no validation that hashing is done on server
   - Consider: Rate limiting by IP on client side is insufficient

2. **No CSRF Protection:**
   - Express app does not include CSRF middleware
   - Recommended: Add `csrf-protection` or similar

3. **No Rate Limiting:**
   - No global or per-endpoint rate limiting
   - Bots could spam reviews/registrations
   - Recommendation: Add redis-based rate limiter

4. **Session Secret:**
   - Falls back to "dev-session-secret-change-me" in development
   - Warning logged but no hard check in production
   - Ensure SESSION_SECRET is always set in prod

5. **Avatar URL Storage:**
   - Avatar URL saved to DB can theoretically point anywhere
   - Current: Enforced to R2 URLs to prevent XSS
   - Recommendation: Validate URL format on server

6. **No Input Length Validation on Server:**
   - Some fields validated only by Zod on receipt
   - Consider adding max length checks on DB queries themselves

---

## Code Quality Issues

1. **Error Handling Inconsistency:**
   - Some endpoints throw errors, some return error responses
   - Root error handler catches and returns JSON
   - Recommendation: Standardize on throwing errors

2. **No Logging:**
   - Limited logging for debugging production issues
   - Winston or Pino recommended

3. **Hard-Coded Values:**
   - MAX_USERNAME_LENGTH = 20 in user-helpers.ts
   - MAX_REVIEW_COMMENT = 500 in schema
   - Consider: Config file for tunable parameters

4. **Mock Data Completely Removed:**
   - No localStorage fallback anymore
   - All endpoints must work for app to function
   - Good: Enforces real DB integration

---

## TODOs / FIXMEs in Code

**Search:**

- No grep results for "TODO" or "FIXME" found (code is clean)

**Recommendations for Future:**

- [ ] Add TypeScript `@deprecated` comments before removing old endpoints
- [ ] Document all error codes in a central registry
- [ ] Consider API versioning (e.g., /api/v1/) before Phase 2

---

# 10) Quickstart

## How to Run Locally

### Prerequisites

- Node.js 20+ (or use nvm)
- PostgreSQL 14+ (or use Neon's cloud service)
- npm or yarn
- Environment variables set

### Setup Steps

1. **Clone and Install:**

   ```bash
   cd /Users/hamzanayab/Desktop/TT/Trusthread
   npm install
   ```

2. **Environment Variables (.env):**

   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@localhost/middlemen

   # Session
   SESSION_SECRET=your-secret-key-here (change in production)

   # Google OAuth (optional, for social login)
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_CALLBACK_URL=http://localhost:5010/api/auth/google/callback
   APP_URL=http://localhost:5010

   # Cloudflare R2 (for avatar uploads)
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=trust
   R2_ENDPOINT=https://{ACCOUNT_ID}.r2.cloudflarestorage.com
   R2_PUBLIC_BASE_URL=https://pub-93fc527fa42d42048adf3452b753214f.r2.dev

   # Node Environment
   NODE_ENV=development
   ```

### Run Development Mode

```bash
# Terminal 1: Start backend server (port 5010)
npm run dev

# Terminal 2: Start frontend Vite dev server (port 5000)
npm run dev:client

# Browser: Open http://localhost:5010
```

**What Happens:**

- Backend Express server on port 5010
- Frontend Vite dev server on port 5000
- Vite proxy configured to route /api/\* to backend
- HMR enabled for fast frontend refresh

---

## Database Migrations (Drizzle)

### Push Schema to DB

```bash
npm run db:push
```

**Note:** This:

- Creates tables if they don't exist
- Adds indexes
- Applies migrations from `drizzle/` folder
- Safe to run multiple times (idempotent for most operations)

### Inspect DB Schema

```bash
drizzle-kit studio
```

Opens local UI to browse tables, run queries, etc.

---

## Build for Production

```bash
npm run build
```

**Outputs:**

- `dist/index.cjs` - Bundled server
- `dist/client/` - Bundled frontend

**Run Production Build:**

```bash
npm run preview
# or
npm start
```

**Port:** Uses `PORT` env var or defaults to 5005

### Deployment Recommendations

- **Frontend:** Vercel (connected to GitHub)
- **Backend:** Vercel Serverless Functions OR Express standalone (Railway, Render, Heroku)
- **Database:** Neon (PostgreSQL-as-a-service, free tier available)
- **Storage:** Cloudflare R2 (S3-compatible, cheap object storage)

---

## Testing (If Applicable)

**Smoke Tests:**

```bash
tsx script/smoke-test.ts
```

**Note:** Limited test coverage currently. Tests should validate:

- [ ] Auth flow (register → login → logout)
- [ ] Profile CRUD
- [ ] Link management + drag-reorder
- [ ] Review submission + anti-spam
- [ ] Search functionality
- [ ] Avatar upload (file validation, compression, R2 upload)

---

## Environment Checklist

| Variable             | Required?  | Example                                             | Notes                             |
| -------------------- | ---------- | --------------------------------------------------- | --------------------------------- |
| DATABASE_URL         | Yes        | postgresql://...                                    | Neon cloud or local Postgres      |
| SESSION_SECRET       | Yes (prod) | secure-random-key                                   | Change from default in production |
| GOOGLE_CLIENT_ID     | No         | 123...oauth.apps...                                 | Required for Google OAuth button  |
| GOOGLE_CLIENT_SECRET | No         | secret-xyz                                          | Required for Google OAuth         |
| APP_URL              | No         | http://localhost:5010                               | Defaults to localhost:5010 in dev |
| R2_ACCOUNT_ID        | Yes        | abc123xyz                                           | Cloudflare account number         |
| R2_ACCESS_KEY_ID     | Yes        | ...                                                 | R2 API credential                 |
| R2_SECRET_ACCESS_KEY | Yes        | ...                                                 | R2 API secret                     |
| R2_BUCKET            | Yes        | trust                                               | Required: R2 bucket name          |
| R2_ENDPOINT          | Yes        | https://abc123xyz.r2.cloudflarestorage.com          | R2 API endpoint                   |
| R2_PUBLIC_BASE_URL   | Yes        | https://pub-93fc527fa42d42048adf3452b753214f.r2.dev | Public URL for served files       |
| NODE_ENV             | No         | development                                         | Auto-detected from PORT or script |

---

## Common Issues

| Issue                      | Solution                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| "DATABASE_URL is required" | Add DATABASE_URL to .env                                          |
| Port 5010 already in use   | `lsof -ti :5010 \| xargs -r kill -9`                              |
| Session not persisting     | Ensure DATABASE_URL is set and MemoryStore is fallback            |
| Google OAuth fails         | Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL |
| Avatar upload fails        | Check R2 credentials and bucket exists                            |
| "Failed to fetch" on login | Ensure credentials: 'include' in fetch calls                      |

---

# END OF PROJECT REFERENCE SNAPSHOT

**Last Updated:** February 22, 2026  
**Accuracy Level:** High (sourced from actual codebase)  
**Maintainer:** Development Team

For questions or updates to this reference, consult the `/dev/` folder or relevant documentation files.
