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

## Files to review

- `client/src/pages/dashboard.tsx`
- `client/src/pages/profile.tsx`
- `client/src/components/ProfilePreviewPhone.tsx`
- `client/src/lib/api.ts`
- `client/src/lib/avatar.ts` - Avatar compression utility
- `client/src/pages/disabled.tsx` - Disabled account page
- `client/src/pages/admin-users.tsx` - Admin user management (if exists)
