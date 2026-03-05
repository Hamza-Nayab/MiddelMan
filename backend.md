# Backend Implementation Reference (Optimization)

## Core stack

- Express.js
- Drizzle ORM (PostgreSQL)
- Sessions via `express-session` + PostgreSQL store
- Google OAuth + local auth
- Sharp + Multer for avatar uploads

## Key routes

- `/api/me` -> fetch user + profile
- `/api/me/onboarding` -> complete seller onboarding (bio, avatar, displayName)
- `/api/me/analytics` -> daily views/clicks series (1-30 days) (lazy-loaded on frontend)
- `/api/me/links` -> fetch seller's active links (sorted)
- `/api/me/links/reorder` -> **NEW** bulk reorder endpoint (PATCH, single atomic update)
- `/api/me/avatar` -> **NEW** upload avatar (POST, multipart/form-data)
- `/api/me/reviews/:reviewId/dispute` -> **NEW** create review dispute (POST)
- `/api/me/reviews/:reviewId/dispute/evidence` -> **NEW** upload dispute evidence (POST, multipart/form-data)
- `/api/profile/:username` -> public profile (optional `track=1`)
- `/api/profile/:username/bundle` -> **NEW** bundled profile response (eliminates waterfall)
  - Includes: user, profile, links, reviews, stats, isOwner
  - Single query: 4 parallel DB queries max (profile, links, reviews, stats)
- `/api/profile/:userId/click` -> track link clicks
- `/api/admin/users` -> **NEW** list/search users with pagination
- `/api/admin/users/:id/disable` -> **NEW** disable user account
- `/api/admin/users/:id/enable` -> **NEW** enable user account
- `/api/admin/users/:id/role` -> **NEW** change user role (requires master admin)
- `/api/admin/reviews` -> list/filter reviews (admin only)
- `/api/admin/disputes` -> **NEW** list/filter disputes with pagination
- `/api/admin/disputes/:id/resolve` -> **NEW** resolve dispute (valid/rejected)
- `/api/admin/disputes/:id/evidence` -> **NEW** delete dispute evidence from R2
- `/api/admin/sellers/:userId` -> **NEW** get user detail view (any user: buyer/seller/admin) including reviews given & received
- `/api/admin/analytics/overview` -> **NEW** platform analytics (7 or 30 days)

## Analytics write path

- `recordDailyStat()` uses `INSERT ... ON CONFLICT DO UPDATE`
- Views: only recorded when `track=1` is passed
- Clicks: explicit POST endpoint
- **Sampling**: 1/3 client-side rate + session/day window

## Link reorder optimization

- **OLD**: Multiple PATCH /api/me/links/:id calls (N updates)
- **NEW**: Single PATCH /api/me/links/reorder with `{orderedIds: [...]}`
- Atomic UPDATE with CASE WHEN for sortOrder (single transaction)
- Reduces write volume by ~N× (N = links reordered)

## Optimization summary

- ✅ Bulk link reorder (1 atomic update instead of N)
- ✅ Bundle endpoint (4 parallel queries instead of waterfall)
- ✅ Owner exclusion in tracking (backend returns isOwner flag)
- ✅ Analytics writes sampled (3× reduction)
- ✅ No SELECT \* patterns, optimized column selection
- ✅ Deployment: Express.js monolithic server (not serverless)
- ✅ Connection pooling: node-postgres Pool with default 10 connections

## Master Admin Authorization

**Authorization Hierarchy:** User → Admin → Master Admin

### requireMasterAdmin() Helper

- Located in `server/routes.ts`
- Verifies user has `isMasterAdmin` flag
- Throws 403 FORBIDDEN if not master admin
- Used to protect sensitive endpoints

### Protected Endpoints (Master Admin Only)

- `PATCH /api/admin/users/:id/role` - promote/demote users to admin role
- Requires master admin to change any user role

### Bootstrap Process

- First master admin must be set manually in database
- Use `bootstrap_master_admin.js` script to set initial master admin
- Not accessible via API for security
- Master admins can promote other admins, but not other master admins

## Account Disabled Enforcement

### Enforcement Points (4 locations)

1. **Login** - Check during authentication
2. **`/api/me`** - Check on user data fetch
3. **`requireRole()`** - Middleware check for protected routes
4. **`requireAdmin()`** - Admin-specific middleware check

### Error Response

- Status: 403 FORBIDDEN
- Error code: `ACCOUNT_DISABLED`
- Message includes: `disabledReason`, `disabledAt`
- Session destroyed automatically for disabled users

### Database Fields Used

- `isDisabled` - Boolean flag
- `disabledReason` - Text explanation (visible to user)
- `disabledAt` - Timestamp
- `disabledByAdminId` - Foreign key to admin user

## Admin User Management Endpoints

### GET /api/admin/users

- **Auth:** Admin required
- **Purpose:** List/search users with cursor pagination
- **Query params:** `query` (username/email/ID), `role`, `status`, `cursor`, `limit`
- **Response:** Array of users with profiles, pagination cursor
- **Creates:** Audit log entry for each search

### PATCH /api/admin/users/:id/disable

- **Auth:** Admin required
- **Body:** `{ reason: string }` (required, 1-500 chars)
- **Response:** Updated user object
- **Side effects:**
  - Sets `isDisabled = true`
  - Records `disabledReason`, `disabledAt`, `disabledByAdminId`
  - Creates audit log entry
  - Destroys active sessions for disabled user

### PATCH /api/admin/users/:id/enable

- **Auth:** Admin required
- **Body:** None
- **Response:** Updated user object
- **Side effects:**
  - Sets `isDisabled = false`
  - Clears `disabledReason`, `disabledAt`, `disabledByAdminId`
  - Creates audit log entry

## Avatar Upload System

### POST /api/me/avatar

- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Field name:** `avatar`
- **File validation:**
  - Max size: 5MB
  - MIME types: `image/jpeg`, `image/png`, `image/webp`
  - Multer middleware validates before processing

### Processing Pipeline

1. **Multer** - Parse multipart upload, validate file
2. **Sharp** - Resize to 256×256 (cover crop), convert to WebP quality 80
3. **R2 Upload** - Upload to Cloudflare R2 at key `avatars/{userId}.webp`
4. **DB Update** - Update `profiles.avatarUrl` with public URL + version param
5. **Response** - Return new avatarUrl with cache-busting version

### Cloudflare R2 Integration

- **Location:** `server/r2.ts`
- **Client:** AWS SDK S3 client (R2 is S3-compatible)
- **Bucket:** Configured via `R2_BUCKET` env var
- **Cache headers:** `public, max-age=31536000, immutable` (1 year)
- **Version params:** `?v={timestamp}` for cache busting on updates
- **Public URL:** Configured via `R2_PUBLIC_BASE_URL` env var

### Error Handling

- `400 VALIDATION_ERROR` - Invalid file type or size
- `401 UNAUTHORIZED` - No session
- `500 UPLOAD_ERROR` - Sharp processing failed
- `500 R2_UPLOAD_FAILED` - Cloudflare R2 error

## Review Dispute System

### POST /api/me/reviews/:reviewId/dispute

- **Auth:** Required (seller must own the review)
- **Purpose:** Create a dispute for a review received by the seller
- **Body:** `{ reason: string (required), message?: string }`
- **Validation:**
  - Seller must own the review being disputed
  - Only one dispute per review (unique constraint)
  - Reason is required
- **Response:** Created dispute object with status `open`
- **Error codes:**
  - `403 FORBIDDEN` - Review not owned by seller
  - `404 REVIEW_NOT_FOUND` - Review doesn't exist
  - `409 DISPUTE_EXISTS` - Dispute already exists for this review

### POST /api/me/reviews/:reviewId/dispute/evidence

- **Auth:** Required (seller must own the dispute)
- **Content-Type:** `multipart/form-data`
- **Field name:** `evidence`
- **File validation:**
  - Max size: 10MB
  - MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
  - Server-side validation:
    - Images: Sharp metadata validation
    - PDFs: Signature validation (%PDF header check)
- **Processing:**
  1. Multer parses upload
  2. Validate file content with Sharp (images) or signature check (PDFs)
  3. Upload to R2 at key: `review-disputes/{disputeId}/{timestamp}.{ext}`
  4. Update dispute with: `evidenceUrl`, `evidenceKey`, `evidenceMime`
- **Response:** Updated dispute object with evidence URL
- **Error codes:**
  - `400 VALIDATION_ERROR` - Invalid or corrupted file
  - `404 DISPUTE_NOT_FOUND` - Dispute doesn't exist
  - `500 UPLOAD_FAILED` - R2 upload error

## Admin Dispute Management

### GET /api/admin/disputes

- **Auth:** Admin required
- **Purpose:** List all disputes with filtering and pagination
- **Query params:**
  - `status` - Filter by status (open, resolved_valid, resolved_rejected)
  - `sellerId` - Filter by seller ID
  - `limit` - Results per page (1-100, default 20)
  - `cursor` - Pagination cursor (dispute ID)
- **Response:** Paginated list with:
  - Dispute details (including evidence URL/MIME type)
  - Associated review (rating, comment, author)
  - Seller info (username, displayName)
  - `nextCursor` for pagination
- **Performance:** Cursor-based pagination (up to 100 items per query)

### PATCH /api/admin/disputes/:id/resolve

- **Auth:** Admin required
- **Purpose:** Resolve a dispute (approve or reject)
- **Body:**
  ```json
  {
    "outcome": "valid" | "rejected",
    "resolutionNote": "string (optional)",
    "hideReview": boolean (optional)
  }
  ```
- **Logic:**
  - `outcome: "valid"` → status becomes `resolved_valid`, review auto-hidden
  - `outcome: "rejected"` → status becomes `resolved_rejected`
  - `hideReview: true` → force hide review regardless of outcome
  - Records: `resolvedAt`, `resolvedByAdminId`, `resolutionNote`
- **Side effects:**
  - Creates audit log entry with action `RESOLVE_DISPUTE`
  - May hide associated review
- **Response:** Updated dispute object

### DELETE /api/admin/disputes/:id/evidence

- **Auth:** Admin required
- **Purpose:** Delete dispute evidence from R2 storage
- **Side effects:**
  - Deletes file from R2 bucket using stored `evidenceKey`
  - Sets `deletedEvidenceAt` timestamp in dispute record
  - Creates audit log entry with action `DELETE_DISPUTE_EVIDENCE`
  - Idempotent: doesn't error if file already missing
- **Response:** Updated dispute object
- **Note:** Soft-delete approach - preserves `evidenceUrl` and `evidenceKey` for audit trail

## Admin Analytics & Seller Management

### GET /api/admin/sellers/:sellerId

- **Auth:** Admin required
- **Purpose:** Get comprehensive user information for admin review (works for any user: buyer, seller, or admin)
- **Response includes:**
  - User details (id, username, email, role, isDisabled, disabledReason, createdAt, isMasterAdmin)
  - Profile details (complete profile object)
  - Links (all links sorted by sortOrder)
  - Stats (avgRating, totalReviews - excludes hidden reviews received)
  - reviewsReceived (last 20 reviews this user received as seller, includes hidden flag)
  - reviewsGiven (last 20 reviews this user gave as buyer)
  - Disputes (last 20 disputes created by this user, with status and resolution info)
- **Use case:** Admin user detail page - view buyer and seller activity for any user

### GET /api/admin/analytics/overview

- **Auth:** Admin required
- **Purpose:** Platform-wide analytics overview
- **Query params:** `days` - 7 or 30 (default 7)
- **Response:**
  ```json
  {
    "days": 7,
    "totalViews": 12345,
    "totalClicks": 3456,
    "topSellersByViews": [
      { "userId": 1, "username": "...", "displayName": "...", "views": 500 }
    ],
    "topSellersByClicks": [
      { "userId": 2, "username": "...", "displayName": "...", "clicks": 200 }
    ]
  }
  ```
- **Performance:**
  - Cached for 60 seconds (in-memory Map cache)
  - Aggregates from `profile_daily_stats` table
  - Top 10 sellers by views
  - Top 10 sellers by clicks
- **Cache key:** `analytics-overview-{days}`

## Files to review

- `server/routes.ts`
- `server/index.ts`
- `server/auth.ts`
- `server/db.ts`
- `server/r2.ts` - Cloudflare R2 integration
- `bootstrap_master_admin.js` - Master admin bootstrap script
