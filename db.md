# DB Reference (Optimization)

## Core tables

- `users`
- `profiles`
- `links`
- `reviews`
- `profile_daily_stats`
- `admin_audit_logs`
- `review_disputes`

## Analytics table

`profile_daily_stats`

- PK: (`user_id`, `day`)
- Columns: `views`, `clicks`, `updated_at`
- Used by `/api/me/analytics` (lazy-loaded on client)
- **Optimization**: 3× write reduction via 1/3 sampling rate + session/day window

## Indexes to validate

- `links_user_active_sort_idx` (links) - used by link reorder
- `reviews_seller_created_idx`, `reviews_seller_hidden_created_idx` - used by bundle query
- `profile_daily_stats_user_day_idx` - used by analytics queries
- `users_username_lower_idx` - Functional index on `lower(username)` for case-insensitive lookups
- `admin_audit_logs_admin_created_idx` - used for admin action tracking
- `review_disputes_status_created_idx` - used for dispute management

## Write-heavy paths (OPTIMIZED)

- **Link reorder**: Reduced from N PATCH calls to 1 bulk UPDATE (CASE WHEN)
  - Atomic transaction, single write
- **Review creation**: Unchanged
- **Analytics upsert**: 3× reduction via sampling
  - 1/3 client-side rate
  - Session/day deduplication key
  - Server-side upsert (INSERT ON CONFLICT DO UPDATE)

## Query optimization summary

- ✅ Bundle endpoint: 4 parallel queries (profile, links, reviews, stats) instead of waterfall
- ✅ Analytics lazy-loaded: skipped entirely if user doesn't visit Analytics tab
- ✅ Bulk reorder: 1 atomic write instead of N individual updates
- ✅ Owner tracking excluded: backend returns isOwner flag for client-side filtering
- ✅ No query invalidation: frontend uses setQueryData for instant updates

## Performance impact

| Operation              | Before     | After      | Savings               |
| ---------------------- | ---------- | ---------- | --------------------- |
| Bulk link reorder      | N writes   | 1 write    | ~N× write reduction   |
| Bundle profile request | 3 requests | 1 request  | ~3× latency reduction |
| Analytics writes       | 3 per view | 1 per view | 3×                    |
| Owner profile views    | Counted    | Excluded   | N/A (accuracy)        |

## Admin Moderation Schema

### Users Table Extensions

- `isDisabled` (boolean) - Account disabled flag
- `disabledReason` (text) - Why account was disabled
- `disabledAt` (timestamp) - When account was disabled
- `disabledByAdminId` (integer) - Which admin disabled the account
- `isMasterAdmin` (boolean) - Master admin flag (can promote/demote admins)

### Admin Audit Logs Table

- Tracks all admin actions (disable/enable users, hide reviews, role changes, dispute resolutions, evidence deletions)
- Columns: `id`, `adminId`, `action`, `targetUserId`, `targetReviewId`, `targetDisputeId`, `details` (json), `createdAt`
- Action types (enum): `DISABLE_USER`, `ENABLE_USER`, `HIDE_REVIEW`, `UNHIDE_REVIEW`, `PROMOTE_ADMIN`, `DEMOTE_ADMIN`, `RESOLVE_DISPUTE`, `DELETE_DISPUTE_EVIDENCE`
- Index: `admin_audit_logs_admin_created_idx` on (adminId, createdAt)

### Review Disputes Table

- Allows sellers to dispute unfair reviews with evidence upload support
- Columns: `id`, `reviewId` (unique, FK to reviews), `sellerId`, `status`, `reason`, `message`, `evidenceUrl`, `evidenceMime`, `evidenceKey`, `createdAt`, `resolvedAt`, `resolvedByAdminId`, `resolutionNote`, `deletedEvidenceAt`
- Status types (enum): `open`, `resolved_valid`, `resolved_rejected`
- Evidence storage:
  - Stored in Cloudflare R2 bucket
  - Path format: `review-disputes/{disputeId}/{timestamp}.{ext}`
  - Supported formats: Images (JPEG, PNG, WebP) and PDF documents
  - Server-side validation: Image metadata check with Sharp, PDF signature validation
  - Max size: 10MB per file
  - Soft-delete support: `deletedEvidenceAt` timestamp tracks admin evidence deletions
- Index: `review_disputes_status_created_idx` on (status, createdAt)
- Note: Each review can have only one dispute (unique constraint on reviewId)

## Schema files

- `shared/schema.ts`
- `run_migration.js`
- `fix_schema.sql`
- `migrations/0000_admin_moderation.sql`
- `migrations/0001_username_lower_idx.sql`
