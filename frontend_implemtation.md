# Frontend Implementation Reference (Optimization)

## Core stack

- React + Vite
- TanStack Query for data fetching
- React Hook Form + Zod for forms
- Tailwind + Radix UI components

## Data flow (key screens)

### Dashboard

- Queries: `me`, `links`, `owner-reviews`, `analytics` (lazy-loaded)
- **Optimization**: Analytics only fetched when activeTab === "analytics"
- Live preview: uses only local data + `react-hook-form` watch values
- Analytics chart: Recharts `AreaChart`, 14-day series, totals computed in memory
- Profile editor: `profileForm` state -> `updateProfile` mutation (no invalidation, uses setQueryData)
- Link reorder: `PATCH /api/me/links/reorder` bulk endpoint (single call, not N updates)

### Public Profile

- **Optimized**: Single bundle query `GET /api/profile/:username/bundle` replaces 3 separate queries
  - Bundle includes: user, profile, links, reviews, stats, isOwner
  - No waterfall: all data fetched in parallel (4 DB queries max)
- Click tracking: `POST /api/profile/:userId/click` (sampled, once per session/day)
- **Owner exclusion**: Owners' own profile views not tracked (no double-counting)

## Notable components

- `ProfilePreviewPhone`: phone-like preview, no iframe, no extra API calls
- `OnboardingWizard`: step flow for bio + avatar + confirm

## Optimization summary

- ✅ Lazy-load analytics (saves 1 DB query for non-analytics users)
- ✅ Eliminated query invalidation (setQueryData for instant updates)
- ✅ Bulk link reorder (1 write instead of N writes)
- ✅ Bundle endpoint (1 request instead of 3, eliminates waterfall)
- ✅ Owner tracking excluded (prevents self-view counting)

## Account Disabled UI

### Disabled Account Page

- **Route:** `/disabled`
- **Location:** `client/src/pages/disabled.tsx`
- **Purpose:** Display message to users with disabled accounts
- **Content:**
  - Disabled reason (from `disabledReason` field)
  - Disabled timestamp
  - Support contact information
  - "Sign Out" button

### Error Handling Flow

1. API returns `403 ACCOUNT_DISABLED` error
2. Error handler catches error in:
   - `dashboard.tsx`
   - `admin.tsx`
   - `my-reviews.tsx`
3. User redirected to `/disabled` page
4. Toast notification shows "Your account has been disabled"

### Login Flow Integration

- Login attempt by disabled user returns error
- Error displayed as toast on auth page
- No redirect to dashboard
- Session not created

## Avatar Upload UI

### Client-Side Compression

- **Location:** `client/src/lib/avatar.ts`
- **Function:** `compressAvatar(file: File): Promise<File>`
- **Process:**
  1. Load image into canvas
  2. Resize to 256×256 with center crop
  3. Export as WebP quality 0.8
  4. Validate output < 100KB
  5. Return new File object

### Dashboard Integration

- **Location:** `client/src/pages/dashboard.tsx` (Profile tab)
- **UI Elements:**
  - Avatar preview (circular)
  - "Change Avatar" button (opens file picker)
  - Loading spinner during upload
  - Success/error toast notifications
- **File Input:**
  - Accept: `image/jpeg,image/png,image/webp`
  - Max size validated client-side (5MB)
  - Wrong type/size shows error toast

### Upload Flow

1. User selects file from file picker
2. Client validates file type and size
3. Call `compressAvatar(file)` - Canvas compression
4. Call `api.uploadAvatar(compressedFile)` - Send to server
5. Server responds with new `avatarUrl`
6. Update local profile state with `setQueryData`
7. Avatar preview updates instantly
8. Success toast: "Avatar updated successfully"

### Error Handling

- File too large: "File must be less than 5MB"
- Wrong file type: "Please select an image file"
- Compression failed: "Failed to process image"
- Upload failed: "Failed to upload avatar" (with server error)
- R2 error: Specific error message from server

## Admin User Management UI

### Admin Users Page

- **Route:** `/admin/users`
- **Auth:** Admin only
- **Purpose:** Search, view, and manage user accounts

### UI Features

#### Search & Filters

- **Search bar:** Username, email, or user ID
- **Role filter:** Dropdown (All / Buyer / Seller / Admin)
- **Status filter:** Dropdown (All / Active / Disabled)
- **Real-time search:** Debounced input (300ms)

#### User List Table

- **Columns:**
  - Avatar + Display Name
  - Username
  - Email
  - Role badge (color-coded)
  - Status badge (Active/Disabled)
  - Actions dropdown
- **Pagination:** Cursor-based "Load More" button
- **Empty state:** "No users found" message

#### Action Buttons

**Per-user actions in dropdown menu:**

- **Disable Account** (if active)
  - Opens modal with reason textarea
  - Required: 1-500 character reason
  - Confirms with "Disable" button
  - Shows success toast
  - Updates user list instantly
- **Enable Account** (if disabled)
  - Shows confirmation dialog
  - No modal/reason needed
  - Updates instantly
- **Promote to Admin** (if not admin, master admin only)
  - Confirmation dialog
  - Updates role instantly
- **Demote from Admin** (if admin, master admin only)
  - Confirmation dialog
  - Cannot demote master admins

### API Integration

- `useQuery("admin-users")` - Fetch user list with filters
- `useMutation("disable-user")` - Disable user account
- `useMutation("enable-user")` - Enable user account
- `useMutation("change-role")` - Promote/demote admin role
- Uses `setQueryData` for instant updates (no refetch)

### Permission Checks

- Regular admins: Can disable/enable users
- Master admins: Can disable/enable + promote/demote admins
- UI hides restricted actions based on current user role
- Server validates permissions (frontend is not source of truth)

## Review Dispute UI (Seller)

### My Reviews Page - Dispute Creation

- **Location:** `client/src/pages/my-reviews.tsx` or `dashboard.tsx` Reviews tab
- **Trigger:** "Dispute" button on each review card
- **Purpose:** Allow sellers to challenge unfair/false reviews

### Dispute Creation Modal

- **UI Elements:**
  - Reason dropdown (select from predefined reasons or "Other")
  - Message textarea (optional, additional context)
  - Evidence upload section
  - Submit button
- **Validation:**
  - Reason is required
  - Message max 500 chars (optional)
  - Evidence optional but recommended

### Evidence Upload (Part 2)

- **Location:** Separate upload after dispute created, or inline in modal
- **Accepted formats:** Images (JPEG, PNG, WebP) or PDF documents
- **Max size:** 10MB
- **Client-side preview:** Show uploaded file name/thumbnail
- **Upload flow:**
  1. Select file from picker
  2. Validate type and size
  3. Call `api.uploadDisputeEvidence(reviewId, file)`
  4. Show upload progress
  5. Display success/error message
  6. Show evidence URL or preview
- **Error handling:**
  - File too large: "File must be less than 10MB"
  - Invalid format: "Please upload an image or PDF"
  - Upload failed: Server error message

### Dispute Status Display

- **Status badges:** Open / Resolved (Valid) / Resolved (Rejected)
- **Show resolution note** from admin when resolved
- **Evidence link:** Clickable to view uploaded evidence
- **Timestamps:** Created date, resolved date (if resolved)

## Admin Disputes Management UI

### Admin Disputes Page

- **Route:** `/admin/disputes`
- **Auth:** Admin only
- **Purpose:** Review and resolve seller disputes

### UI Features

#### Filters & Search

- **Status filter:** All / Open / Resolved (Valid) / Resolved (Rejected)
- **Seller filter:** Search by seller username or ID
- **Pagination:** Cursor-based "Load More" button (20 per page)

#### Dispute List Table

- **Columns:**
  - Dispute ID
  - Seller (username + displayName)
  - Review preview (rating + truncated comment)
  - Reason & Message
  - Evidence indicator (icon if evidence uploaded)
  - Status badge
  - Created date
  - Actions dropdown
- **Empty state:** "No disputes found"
- **Loading states:** Skeleton loaders while fetching

#### Dispute Detail Modal/Panel

- **Full review display:** Rating, comment, author name, date
- **Dispute details:** Reason, message, evidence (image/PDF viewer or download link)
- **Evidence viewer:**
  - Images: Inline lightbox viewer
  - PDFs: Download button or embedded viewer
- **Admin actions:**
  - **Resolve as Valid** - Approve dispute, hide review
  - **Resolve as Rejected** - Reject dispute, keep review visible
  - **Resolution note:** Text area for admin explanation (optional)
  - **Hide Review toggle:** Option to hide review even if rejecting dispute
  - **Delete Evidence** - Remove evidence from R2 (rare, for policy violations)

#### Resolution Flow

1. Admin clicks "Resolve" on a dispute
2. Modal opens with dispute details
3. Admin reviews evidence and review content
4. Admin selects outcome: Valid or Rejected
5. Admin enters resolution note (optional but recommended)
6. Admin optionally checks "Hide Review" if needed
7. Confirm resolution
8. Dispute status updates
9. Review hidden if outcome was "valid" or hide toggle checked
10. Success toast + list refreshes

### API Integration

- `useQuery("admin-disputes")` - Fetch disputes list with filters
- `useMutation("resolve-dispute")` - Resolve dispute
- `useMutation("delete-evidence")` - Delete evidence file
- Uses `setQueryData` for instant updates

### Permission Checks

- All admins can view and resolve disputes
- Master admin status not required for dispute resolution
- Evidence deletion restricted to admins (logged in audit trail)

## Admin Analytics UI

### Admin Analytics Page

- **Route:** `/admin/analytics`
- **Auth:** Admin only
- **Purpose:** Platform-wide performance metrics

### UI Features

#### Time Range Selector

- **Options:** Last 7 days / Last 30 days
- **Default:** 7 days
- **Toggle buttons** or dropdown

#### Metrics Dashboard

- **Total Views Card:** Large number with trend indicator (if available)
- **Total Clicks Card:** Large number with trend indicator
- **CTR (Click-Through Rate):** Calculated as (clicks / views) \* 100

#### Top Sellers Lists

- **Top 10 by Views:**
  - Seller avatar + name (clickable to seller detail)
  - View count
  - Bar chart or sparkline
- **Top 10 by Clicks:**
  - Seller avatar + name
  - Click count
  - Bar chart or sparkline

### Data Visualization

- **Charts library:** Recharts or similar
- **Refresh indicator:** Shows cache status (data cached for 60s)
- **Manual refresh button:** Force cache invalidation
- **Loading states:** Skeleton cards while fetching
- **Empty state:** Message if no data in time range

### API Integration

- `useQuery("admin-analytics-overview", { days: 7 })` - Fetch overview data
- **Caching:** React Query caches for 60 seconds (matches server cache)
- **Stale time:** 60 seconds
- **Refetch:** On focus/mount

## Admin User Detail UI

### Admin User Detail Page

- **Route:** `/admin/sellers/:userId` (works for any user: buyer, seller, or admin)
- **Auth:** Admin only
- **Purpose:** Deep dive into any user's account (buyer or seller profile + all their activity)

### UI Layout

#### User Header

- **Avatar:** Large circular avatar
- **Name & Username:** Display name + @username
- **Status badges:**
  - Role (Buyer / Seller / Admin)
  - Account status (Active / Disabled)
  - Master Admin badge (if applicable)
- **Disabled info panel** (if disabled):
  - Reason shown prominently
  - Disabled date
- **Action buttons:**
  - Enable/Disable Account
  - Edit Role (master admin only)
  - View Public Profile

#### Tabs/Sections

1. **Overview Tab:**
   - Email address (admin view only)
   - Account created date
   - Total reviews received (if seller)
   - Average rating
   - Total links
   - Created date

2. **Links Tab:**
   - All user links (active + inactive)
   - Sort order visible
   - Click counts (if available)

3. **Reviews Tab (Tabbed):**
   - **Received Tab:** Recent 20 reviews this user received as seller
     - Shows hidden reviews with indicator
     - Review text, rating, author name, date
     - Click to view full review or take moderation action
   - **Given Tab:** Recent 20 reviews this user gave as buyer
     - Shows review text, rating, target seller ID, date
     - Can see buying behavior and review patterns

4. **Disputes Tab:**
   - Recent 20 disputes created by this user (seller disputes)
   - Status badges (open, resolved_valid, resolved_rejected)
   - Quick view of resolution notes
   - Link to full dispute detail

### API Integration

- `useQuery("admin-seller-detail", userId)` - Fetch all user data
- Returns: user, profile, links, stats, reviewsReceived, reviewsGiven, recentDisputes
- **Single API call** - no waterfalls
- Works for any user role (buyer, seller, admin)

### Navigation

- Breadcrumbs: Admin > Users > [Username]
- Back button to admin users list
- Quick action buttons to other admin pages
- Back button to admin users list
- Quick links to other admin pages

## Files to review

- `client/src/pages/dashboard.tsx` - Seller dashboard with analytics
- `client/src/pages/profile.tsx` - Public profile page
- `client/src/pages/my-reviews.tsx` - Seller reviews management with dispute creation
- `client/src/components/ProfilePreviewPhone.tsx` - Live preview component
- `client/src/lib/api.ts` - Complete API client with all endpoints
- `client/src/lib/avatar.ts` - Avatar compression utility
- `client/src/pages/disabled.tsx` - Disabled account page
- `client/src/pages/admin-users.tsx` - Admin user management
- `client/src/pages/admin-reviews.tsx` - Admin review moderation
- `client/src/pages/admin-disputes.tsx` - Admin dispute resolution
- `client/src/pages/admin-analytics.tsx` - Admin analytics dashboard
- `client/src/pages/admin-seller-detail.tsx` - Admin seller detail view
- `client/src/pages/admin.tsx` - Main admin dashboard/navigation
