# Comprehensive Codebase Analysis

## MiddelMen - Trust + Reputation Platform

**Analysis Date:** February 23, 2026  
**Project Phase:** Phase 1 (Reputation MVP + Analytics + Admin Features)

---

## 1. Architecture Overview

### Deployment Model

- **Type**: Monolithic full-stack application
- **Structure**: Single Express.js server + React client (both served from same server)
- **Runtime**: Node.js with TypeScript (tsx for development, bundled for production)
- **Port**: `5005` (server), `5000` (Vite dev client, optional)

### Technology Stack

**Frontend:**

- React 19.2 + Vite (dev server + build tool)
- TanStack Query 5.60 (data fetching, caching, synchronization)
- React Hook Form 7.66 (form state management)
- Zod 3.25 (runtime validation)
- Radix UI (headless component library)
- Tailwind CSS + Tailwind Animate (styling)
- Recharts 2.15 (analytics charts)
- Wouter 3.3 (lightweight routing)
- Lucide React (icons)

**Backend:**

- Express.js 4.21 (HTTP server)
- Drizzle ORM 0.39 (type-safe PostgreSQL queries)
- Passport.js 0.7 (authentication strategies)
  - Local strategy (email/password)
  - Google OAuth 2.0
- express-session 1.18 (session management)
- Sharp 0.34 (image processing)
- Multer 2.1 (multipart file uploads)
- AWS SDK v3 (Cloudflare R2 S3-compatible API)
- bcryptjs 2.4 (password hashing)

**Database:**

- PostgreSQL (recommended: Neon)
- Drizzle Kit (migrations + schema management)
- connect-pg-simple 10.0 (session store in production)

---

## 2. Code Metrics & File Organization

### Critical File Sizes

| File                                   | Lines | Purpose                                                                                       |
| -------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| `server/routes.ts`                     | 4,136 | ALL API endpoints (auth, profiles, links, reviews, admin, analytics, disputes, notifications) |
| `client/src/pages/dashboard.tsx`       | 2,103 | Seller dashboard + profile editor + link manager + analytics                                  |
| `client/src/pages/admin-disputes.tsx`  | 438   | Admin dispute resolution interface                                                            |
| `client/src/pages/admin-users.tsx`     | 423   | Admin user management & search                                                                |
| `client/src/lib/api.ts`                | 789   | Centralized API client (types + endpoints)                                                    |
| `client/src/pages/admin-analytics.tsx` | 335   | Platform analytics dashboard                                                                  |
| `shared/schema.ts`                     | 377   | Database schema (Drizzle + Zod types)                                                         |

### Project Scope

- **Total TypeScript/JavaScript LOC (~7,400 core)**: Full-stack implementation
- **Database Tables**: 8 (users, profiles, links, reviews, review_disputes, profile_daily_stats, admin_audit_logs, notifications)
- **API Endpoints**: 40+ (auth, user, profile, links, reviews, disputes, admin, analytics, notifications)
- **React Pages**: 14 (auth, dashboard, profile, search, reviews, admin panels, onboarding, demo, 404)
- **React Components**: 30+ (UI components, layouts, specialized components)
- **Hooks**: 10+ (React Query hook patterns, custom hooks)

---

## 3. Core Systems Analysis

### 3.1 Authentication System

**Session-Based with Cookie Persistence**

```
User Login → Passport.js → User ID serialized to session
  ↓
Express-session stores session in PostgreSQL (prod) or Memory (dev)
  ↓
Browser receives Set-Cookie: connect.sid (httpOnly, sameSite=lax)
  ↓
All requests auto-include cookie via credentials: include
  ↓
req.session.userId available on all protected routes
```

**OAuth Integration (Google)**

- Callback URL: `/api/auth/google/callback`
- New users auto-created with generated username
- Redirect flow: new sellers → `/onboarding/role`
- Existing users → dashboard or my-reviews

**Password Security**

- bcryptjs with auto-generated salt
- Client-side: React Hook Form Zod validation
- Server-side: Double validation + schema enforcement

### 3.2 Data Flow Architecture

**Request Path Example (Avatar Upload):**

```
1. Dashboard.tsx → User selects file
2. Canvas compress (client/src/lib/avatar.ts) → smaller WebP
3. FormData.append("avatar", compressed_file)
4. fetch(credentials: include) → /api/me/avatar
5. Middleware stack:
   - express.json()
   - express.urlencoded()
   - session middleware (deserialize userId)
   - passport.initialize() + passport.session()
   - Multer (parse multipart, create InMemoryStorage)
6. Route handler: requireAuth() check
7. Sharp resize(256x256) → WebP(80) quality
8. uploadAvatarToR2() → S3Client.send(PutObjectCommand)
9. Drizzle db.update(profiles).set({avatarUrl})
10. Return {ok: true, avatarUrl}
11. React: useQuery invalidation → instant UI update
```

### 3.3 API Architecture

**Request/Response Pattern:**

```typescript
// All endpoints follow this pattern:
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: {} } };
```

**Error Codes:**

- `VALIDATION_ERROR` - Zod schema validation failed
- `UNAUTHORIZED` - No session or invalid credentials
- `FORBIDDEN` - Insufficient permissions (admin/master admin check)
- `ACCOUNT_DISABLED` - User account disabled (403)
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Duplicate email/username
- `RATE_LIMITED` - Too many requests
- `UPLOAD_ERROR` - File processing failed

**Authentication Middleware Hierarchy:**

```typescript
1. requireAuth(userId: number) - Check session exists
2. requireRole(role: 'seller' | 'admin') - Require specific role
3. requireAdmin() - Admin only
4. requireMasterAdmin() - Master admin only (sensitive ops)
```

### 3.4 Database Schema Design

**8 Tables with Strategic Indexing:**

1. **users** - Core user auth + metadata
   - Index: `users_email_idx` (login)
   - Index: `users_username_lower_idx` (case-insensitive search)
   - Note: Username uniqueness enforced at DB + app level

2. **profiles** - User public profile data
   - Fields: displayName, bio, avatarUrl, theme, verification
   - Index: `profiles_user_id_idx` (1:1 relationship)

3. **links** - Social links for seller profiles
   - Index: `links_user_active_sort_idx` (userId, isActive, sortOrder)
   - Logic: Only active links shown on public profile

4. **reviews** - Review submissions for sellers
   - Index: `reviews_seller_hidden_created_idx` (seller, isHidden, createdAt)
   - Index: `reviews_seller_created_idx` (seller, createdAt)
   - Index: `reviews_reviewer_created_idx` (reviewer, createdAt)
   - Anti-spam: 1 review per (reviewer, seller, timewindow)

5. **review_disputes** - Dispute resolution system
   - Fields: status (open/resolved_valid/resolved_rejected)
   - Evidence stored in R2 (file references in DB)
   - Admin audit trail: who resolved, when, why

6. **profile_daily_stats** - Analytics aggregation
   - Daily rollup: views, clicks per seller
   - Insert on conflict: atomic daily updates
   - Data coverage: 14-30 days (lazy-loaded)

7. **admin_audit_logs** - Admin action tracking
   - All admin modifications logged automatically
   - Tracks: user disabled, role changed, reviews hidden, disputes resolved

8. **notifications** - In-app notifications
   - Types: review_received, dispute_created, dispute_resolved, etc.
   - Read status per user

**Strategic Index Choices:**

- ✅ Composite indexes for WHERE + ORDER BY optimization
- ✅ No SELECT \* (always specific columns)
- ✅ Case-insensitive index on username (raw SQL applied)
- ✅ Hidden flag included in composite indexes (filter visibility efficiently)

---

## 4. API Endpoint Inventory (40+ Endpoints)

### Authentication (5 endpoints)

| Method | Path                        | Auth | Purpose                           |
| ------ | --------------------------- | ---- | --------------------------------- |
| POST   | `/api/auth/register`        | No   | Register buyer/seller             |
| POST   | `/api/auth/login`           | No   | Login (email/username + password) |
| POST   | `/api/auth/logout`          | Yes  | Clear session                     |
| GET    | `/api/auth/google`          | No   | Google OAuth start                |
| GET    | `/api/auth/google/callback` | No   | OAuth callback                    |

### User Profile (10 endpoints)

| Method | Path                           | Auth | Purpose                     |
| ------ | ------------------------------ | ---- | --------------------------- |
| GET    | `/api/me`                      | Yes  | Get current user + profile  |
| PATCH  | `/api/me/profile`              | Yes  | Update profile fields       |
| PATCH  | `/api/me/onboarding`           | Yes  | Complete seller onboarding  |
| PATCH  | `/api/me/role`                 | Yes  | Upgrade buyer → seller      |
| PATCH  | `/api/me/username`             | Yes  | Change seller username      |
| POST   | `/api/me/avatar`               | Yes  | Upload avatar (multipart)   |
| GET    | `/api/username/check`          | No   | Check username availability |
| GET    | `/api/profile/:username`       | No   | Get public seller profile   |
| GET    | `/api/profile/:userId/links`   | No   | Get seller's links          |
| GET    | `/api/profile/:userId/reviews` | No   | Get seller's reviews        |

### Links Management (5 endpoints)

| Method | Path                    | Auth | Purpose                   |
| ------ | ----------------------- | ---- | ------------------------- |
| GET    | `/api/me/links`         | Yes  | Get user's links          |
| POST   | `/api/me/links`         | Yes  | Create new link           |
| PATCH  | `/api/me/links/:id`     | Yes  | Update link               |
| DELETE | `/api/me/links/:id`     | Yes  | Delete link               |
| PATCH  | `/api/me/links/reorder` | Yes  | Atomic bulk reorder (NEW) |

### Reviews System (7 endpoints)

| Method | Path                                         | Auth | Purpose                       |
| ------ | -------------------------------------------- | ---- | ----------------------------- |
| POST   | `/api/profile/:userId/reviews`               | No   | Submit review for seller      |
| GET    | `/api/me/reviews`                            | Yes  | Get reviews of current seller |
| GET    | `/api/me/reviews/given`                      | Yes  | Get reviews authored by user  |
| PATCH  | `/api/me/reviews/given/:id`                  | Yes  | Update own review             |
| PATCH  | `/api/me/reviews/:id/toggle-hidden`          | Yes  | Seller hides review           |
| POST   | `/api/me/reviews/:reviewId/dispute`          | Yes  | Create dispute (NEW)          |
| POST   | `/api/me/reviews/:reviewId/dispute/evidence` | Yes  | Upload dispute evidence (NEW) |

### Analytics (2 endpoints)

| Method | Path                            | Auth  | Purpose                    |
| ------ | ------------------------------- | ----- | -------------------------- |
| GET    | `/api/me/analytics`             | Yes   | 14-day views/clicks series |
| GET    | `/api/admin/analytics/overview` | Yes\* | Platform analytics         |

### Admin Management (12 endpoints)

| Method | Path                               | Auth    | Purpose                        |
| ------ | ---------------------------------- | ------- | ------------------------------ |
| GET    | `/api/admin/users`                 | Yes\*   | List/search users (pagination) |
| PATCH  | `/api/admin/users/:id/disable`     | Yes\*   | Disable user account           |
| PATCH  | `/api/admin/users/:id/enable`      | Yes\*   | Enable user account            |
| PATCH  | `/api/admin/users/:id/role`        | Yes\*\* | Change user role (master only) |
| GET    | `/api/admin/reviews`               | Yes\*   | List all reviews (filters)     |
| PATCH  | `/api/admin/reviews/:id/hide`      | Yes\*   | Admin hide/unhide review       |
| GET    | `/api/admin/disputes`              | Yes\*   | List disputes (pagination)     |
| PATCH  | `/api/admin/disputes/:id/resolve`  | Yes\*   | Resolve dispute                |
| DELETE | `/api/admin/disputes/:id/evidence` | Yes\*   | Delete evidence from R2        |
| GET    | `/api/admin/sellers/:sellerId`     | Yes\*   | Get seller detail view         |
| GET    | `/api/admin/admins`                | Yes\*\* | List all admins (master only)  |
| POST   | `/api/admin/admins`                | Yes\*\* | Create new admin (master only) |

### Notifications (3 endpoints)

| Method | Path                                  | Auth | Purpose                   |
| ------ | ------------------------------------- | ---- | ------------------------- |
| GET    | `/api/me/notifications`               | Yes  | Get user notifications    |
| PATCH  | `/api/me/notifications/:id/read`      | Yes  | Mark notification as read |
| POST   | `/api/me/notifications/mark-all-read` | Yes  | Mark all as read          |

### Utility (2 endpoints)

| Method | Path                         | Auth | Purpose          |
| ------ | ---------------------------- | ---- | ---------------- |
| POST   | `/api/profile/:userId/click` | No   | Track link click |
| GET    | `/api/search`                | No   | Search sellers   |

**Auth Legend:**

- `Yes` = Requires session
- `Yes*` = Admin required
- `Yes**` = Master admin required
- `No` = Public

---

## 5. Frontend Architecture

### State Management Strategy

1. **React Query (TanStack Query)** - Server state (data from API)
2. **React Hook Form** - Form state (local validation)
3. **Zustand-style Context** - Optional UI state (theme, notifications)
4. **URL Params** - Filter/pagination state (shareable)

### Data Fetching Optimization

**Lazy Loading Pattern:**

```typescript
// Dashboard.tsx - Analytics only fetched when needed
const { data: analyticsData } = useQuery({
  queryKey: ["analytics", days],
  queryFn: () => api.getAnalytics(days),
  enabled: activeTab === "analytics", // Only fetch when user views tab
});
```

**Bundle Endpoint Pattern:**

```typescript
// Single request returns multiple related resources
GET /api/profile/:username/bundle
Response: {
  user: {...},
  profile: {...},
  links: [...],
  reviews: [...],
  stats: {...},
  isOwner: boolean
}
```

**Pagination:**

- **Cursor-based** for admin lists (users, disputes)
- **Offset-based** for reviews
- "Load more" button (not infinite scroll)

### Component Organization

**Page Components (14 files)**

- Protected routes use HOC: `<ProtectedRoute>` (checks session)
- Role-checked routes: Admin panels require `role === 'admin'`

**Layout Components**

- `Layout.tsx` - Main app wrapper (header, sidebar nav, mobile menu)
- `AdminLayout.tsx` - Admin panel specific layout
- `ProfilePreviewPhone.tsx` - Phone preview (no iframe, no extra API calls)

**UI Components (30+ files)**

- Radix UI wrappers (Button, Input, Select, Dialog, etc.)
- Composition: Button → buttonVariants → cn(className)

**Custom Hooks (10+)**

- `use-mobile.tsx` - Media query breakpoint detection
- `use-toast.ts` - Sonner toast wrapper
- `use-username-availability.ts` - Debounced username check
- React Query patterns: `useQuery`, `useMutation`, `useQueryClient`

### Large Component Analysis

**dashboard.tsx (2,103 lines) - Should be refactored**

- Tab 1: Profile editor (avatar upload, bio, displayName, links)
- Tab 2: Reviews management (list, create, dispute)
- Tab 3: Analytics (charts, 14-day data)
- Tab 4: Link manager (reorder, create, delete)
- Issues:
  - Single component too large
  - Mixed concerns (form + display + charts)
  - Multiple useQuery calls
  - State spread across multiple useState hooks

**Recommendation:**

```typescript
// Extract into sub-components:
<Dashboard>
  <ProfileTab> (profile editor)
  <ReviewsTab> (reviews list + disputes)
  <AnalyticsTab> (charts)
  <LinksTab> (link manager)
</Dashboard>
```

---

## 6. Database Optimization Implementations

### Current Optimizations ✅

**Index Strategy:**

```sql
-- Username case-insensitive search
CREATE INDEX users_username_lower_idx ON users (lower(username));

-- Links retrieval optimization
links_user_active_sort_idx: (userId, isActive, sortOrder)

-- Review visibility filtering
reviews_seller_hidden_created_idx: (sellerId, isHidden, createdAt)
```

**Query Optimization:**

```typescript
// Bad: SELECT * FROM users
// Good: Specific columns only
const user = await db.select({
  id: users.id,
  username: users.username,
  role: users.role
}).from(users).where(...)

// Batch operations
// Old: Update each link individually (N queries)
// New: PATCH /api/me/links/reorder (1 atomic update)
```

**Analytics Aggregation:**

```typescript
// Upsert pattern for idempotent inserts
INSERT INTO profile_daily_stats (userId, day, views, clicks)
VALUES (...)
ON CONFLICT (userId, day) DO UPDATE
SET views = excluded.views, clicks = excluded.clicks
```

---

## 7. Key Features Implementation

### 7.1 Account Disabling

**Database Fields:**

- `users.isDisabled` (boolean)
- `users.disabledReason` (text)
- `users.disabledAt` (timestamp)
- `users.disabledByAdminId` (foreign key)

**Enforcement Points (4 locations):**

1. Login check → 401 UNAUTHORIZED
2. `/api/me` endpoint → 403 ACCOUNT_DISABLED
3. `requireAuth()` middleware → 403 ACCOUNT_DISABLED
4. Admin-specific routes → 403 ACCOUNT_DISABLED

**Audit Trail:**
Automatic log entry in `admin_audit_logs` when admin disables/enables account

### 7.2 Review Dispute System

**Workflow:**

```
1. Reviewer creates dispute: POST /api/me/reviews/:reviewId/dispute
2. Evidence upload: POST /api/me/reviews/:reviewId/dispute/evidence
3. Admin views: GET /api/admin/disputes?status=open
4. Admin resolves: PATCH /api/admin/disputes/:id/resolve
   - resolved_valid (side with reviewer)
   - resolved_rejected (side with seller)
5. Cleanup: DELETE /api/admin/disputes/:id/evidence (removes from R2)
```

**Data Models:**

```typescript
review_disputes: {
  (id,
    reviewId,
    reviewerUserId,
    reason,
    status,
    resolution,
    resolutionNotes,
    resolvedAt,
    resolvedByAdminId,
    createdAt,
    updatedAt);
}

dispute_evidence: {
  (id, disputeId, fileUrl, fileType, uploadedBy, createdAt);
}
```

### 7.3 Avatar Upload System

**Client-Side Compression (important!):**

```typescript
// Canvas-based compression (client/src/lib/avatar.ts)
1. Load image into canvas
2. Resize to 256×256 (center crop)
3. Export as WebP quality 0.8
4. Validate output < 100KB
5. Validate MIME type in form validation
```

**Server-Side Processing (double validation):**

```typescript
1. Multer validates file type + size
2. Sharp resizes explicitly (256×256, WebP, quality 80)
3. uploadAvatarToR2() sends to Cloudflare R2
4. Public URL: https://bucket.r2.dev/avatars/{userId}.webp?v={timestamp}
5. Cache-Control: immutable (1 year)
6. Version param for cache busting
```

### 7.4 Admin System

**Authorization Hierarchy:**

- User → Admin → Master Admin

**Master Admin Only Operations:**

- Promote/demote users to admin role
- Create new admin
- List all admins

**Bootstrap:**

```bash
# Set initial master admin (manual DB operation)
node bootstrap_master_admin.js
```

---

## 8. Performance Optimizations Already Implemented

### Frontend Optimizations ✅

| Optimization             | Method                               | Impact                                    |
| ------------------------ | ------------------------------------ | ----------------------------------------- |
| Lazy analytics loading   | Query enabled only on tab view       | Saves 1 DB query per user visit           |
| Bundle endpoint          | Single /api/profile/:username/bundle | Eliminates waterfall (4 parallel queries) |
| Form state optimization  | setQueryData instead of invalidation | Instant UI updates (no spinner)           |
| Bulk link reorder        | Single PATCH not N PATCH             | Reduces writes by N×                      |
| Owner tracking exclusion | Backend returns isOwner flag         | Prevents self-view counting               |

### Backend Optimizations ✅

| Optimization       | Method                           | Impact                      |
| ------------------ | -------------------------------- | --------------------------- |
| Analytics sampling | 1/3 rate + session/day window    | 3× reduction in writes      |
| Strategic indexing | Composite indexes on hot queries | 10–100× faster filters      |
| Connection pooling | node-postgres Pool (default 10)  | Handles concurrent requests |
| No SELECT \*       | Explicit column selection        | Smaller network payload     |
| Atomic updates     | CASE WHEN for bulk operations    | No race conditions          |

---

## 9. Known Patterns & Best Practices

### Strengths ✅

1. **Type Safety**: End-to-end TypeScript (frontend + backend)
2. **Schema Validation**: Zod schemas (both server and client)
3. **Error Handling**: Consistent error response format
4. **Authentication**: Industry-standard (Passport.js + sessions)
5. **API Design**: RESTful with consistent response shape
6. **Database**: Drizzle ORM prevents SQL injection
7. **Image Processing**: Dual compression (client + server)
8. **Audit Trail**: Admin actions logged automatically
9. **Optimization**: Strategic caching, batch operations
10. **Rate Limiting**: Implemented (checkRateLimit middleware)

### Patterns Used

```typescript
// Middleware pattern
app.use(requireAuth);

// ORM composition
where(and(eq(users.role, 'seller'), gte(users.createdAt, date)))

// Error handling
try/catch with consistent error formatting
.catch(err => res.json(error('ERROR_CODE', 'Message')))

// Validation pipeline
Input → Zod schema → Business logic → DB → Response
```

---

## 10. Potential Improvements & Refactoring Opportunities

### High Priority

**1. Split routes.ts (4,136 lines)**

```typescript
// Current: All 40+ endpoints in single file
// Recommended: Break into modules
server/
  ├── routes/
  │   ├── auth.ts (5 endpoints)
  │   ├── profile.ts (10 endpoints)
  │   ├── links.ts (5 endpoints)
  │   ├── reviews.ts (7 endpoints)
  │   ├── disputes.ts (4 endpoints)
  │   ├── admin.ts (12 endpoints)
  │   ├── analytics.ts (2 endpoints)
  │   └── notifications.ts (3 endpoints)
  └── routes.ts (exports router)

// Benefits:
// - Each handler in domain-specific file
// - Easier to test individual endpoints
// - Better code organization
// - Reduced cognitive load per file
```

**2. Refactor dashboard.tsx (2,103 lines)**

```typescript
// Current: Single monolithic component
// Recommended: Tab-based sub-components
client/src/pages/dashboard/
  ├── index.tsx (main component + tab logic)
  ├── ProfileTab.tsx (avatar, displayName, bio)
  ├── ReviewsTab.tsx (reviews list + dispute modal)
  ├── AnalyticsTab.tsx (charts, time range selector)
  └── LinksTab.tsx (link list + reorder)

// Benefits:
// - Isolated state per tab
// - Easier to test
// - Parallel development
// - Better performance (code splitting opportunity)
```

**3. Extract Common Logic**

```typescript
// Utility functions repeated across endpoints:
- Admin authorization check (requin Master Admin)
- User eligibility checks (is seller, not disabled)
- Pagination logic (limit, offset, cursor)
- File validation (type, size, MIME)

// Solution: Create helpers
server/middleware/
  ├── auth-helpers.ts
  ├── validation-helpers.ts
  ├── pagination-helpers.ts
  └── file-helpers.ts
```

### Medium Priority

**4. API Client Organization**

- Current: api.ts (789 lines, all endpoints)
- Recommended: Group by domain

```typescript
client/src/lib/api/
  ├── auth.ts
  ├── profile.ts
  ├── links.ts
  ├── reviews.ts
  ├── disputes.ts
  ├── admin.ts
  └── utils.ts (shared helpers)
```

**5. Database Connection Management**

- Current: Single connection pool
- Recommended: Consider read replicas for analytics queries
- May not be necessary at current scale

**6. Session Store Configuration**

- Current: Memory store in dev, PostgreSQL in prod
- Recommended: Consider Redis for multi-server deployments
- Consider session expiration policies

### Low Priority

**7. Testing Infrastructure**

- Current: smoke-test.ts exists
- Recommended: E2E tests (Playwright/Cypress)
- Recommended: Unit tests (Vitest)

**8. Documentation**

- Current: Good reference docs
- Recommended: API docs (Swagger/OpenAPI)
- Recommended: Deployment guide

**9. Monitoring & Logging**

- Current: Basic error handling
- Recommended: Pino/Winston for structured logging
- Recommended: Error tracking (Sentry)

**10. CI/CD Pipeline**

- Current: Manual deployment
- Recommended: GitHub Actions workflow
- Recommended: Pre-commit hooks (husky, lint-staged)

---

## 11. Deployment Architecture

### Production Setup

```
┌─────────────────┐
│  Client (Vite)  │  (Built: dist/public)
├─────────────────┤
│  Express.js     │  (server/index.ts → dist/index.cjs)
├─────────────────┤
│  PostgreSQL     │  (Neon recommended)
├─────────────────┤
│  Cloudflare R2  │  (Avatar + dispute evidence storage)
└─────────────────┘
```

### Environment Variables (Production)

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Session
SESSION_SECRET=<random-strong-key>
NODE_ENV=production

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Application
APP_URL=https://yourdomain.com
PORT=5005

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=trust
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://<domain>.cloudflare.r2.dev
```

### Build Process

```bash
# 1. Install dependencies
npm install

# 2. Run migrations
npm run db:push

# 3. Build
npm run build
# Output: dist/index.cjs (server + client bundled)

# 4. Start
npm start
# Runs: NODE_ENV=production node dist/index.cjs
```

---

## 12. Summary & Recommendations

### Current State (Strengths)

- ✅ Full-stack type-safe application
- ✅ Well-optimized for Phase 1 scale
- ✅ Clear separation of concerns (frontend/backend)
- ✅ Database properly indexed
- ✅ Security best practices (password hashing, session validation)
- ✅ API design consistent and documented
- ✅ Authentication flexible (local + OAuth)

### Roadmap for Growth

**Phase 2 (Scaling):**

1. Split routes.ts into modules (highest impact)
2. Refactor dashboard.tsx into sub-components
3. Add E2E tests for critical flows
4. Set up error tracking (Sentry)

**Phase 3 (Multi-tenancy/Monetization):**

1. Consider service separation (auth → separate service)
2. Add payment processing (Stripe integration)
3. Implement escrow system
4. Consider event-driven architecture (RabbitMQ/Redis)

**Phase 4 (Enterprise):**

1. Horizontal scaling (load balancer + multiple servers)
2. Read replicas for analytics queries
3. Caching layer (Redis)
4. CDN for assets

### Quick Wins (Highest Priority)

1. ⚡ Extract routes into modules (1-2 days, huge clarity gain)
2. ⚡ Split dashboard.tsx tabs (1 day per tab component)
3. ⚡ Add API documentation (Swagger) (1-2 days, high value)

---

**End of Analysis Document**
