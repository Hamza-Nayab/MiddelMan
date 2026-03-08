# Implementation Details & Expansion Guide

## MiddelMen Developer Reference

---

## 1. Adding New Features - Step-by-Step Guide

### Example: Adding a "Seller Verification Badge"

**Step 1: Database Schema Update**

```typescript
// shared/schema.ts
export const profiles = pgTable('profiles', {
  // ... existing fields ...
  isVerified: boolean('is_verified').notNull().default(false),
  verificationMethod: varchar('verification_method', { length: 30 })
    .notNull()
    .default('none'), // 'none' | 'whatsapp_otp' | 'email' | 'manual'
  verificationStatus: varchar('verification_status', { length: 20 })
    .notNull()
    .default('unverified') // 'unverified' | 'pending' | 'verified' | 'rejected'
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationRejectedReason: text('verification_rejected_reason'),
});

// Create migration
// drizzle-kit generate --name add_verification_fields
```

**Step 2: Zod Validation Schema**

```typescript
// shared/schema.ts (add export)
export const verificationUpdateSchema = z.object({
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]),
  verificationRejectedReason: z.string().optional(),
});
```

**Step 3: API Endpoint (Backend)**

```typescript
// server/routes.ts

// POST /api/me/verification/request
app.post(
  "/api/me/verification/request",
  requireRole("seller"),
  async (req, res) => {
    const { method } = z
      .object({
        method: z.enum(["whatsapp_otp", "email"]),
      })
      .parse(req.body);

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, req.session.userId!),
    });

    if (!profile?.whatsappNumber && method === "whatsapp_otp") {
      return res.json(error("VALIDATION_ERROR", "WhatsApp number not set"));
    }

    // Start verification flow...
    // Send OTP to WhatsApp or email

    await db
      .update(profiles)
      .set({
        verificationStatus: "pending",
        verificationMethod: method,
        updatedAt: sql`now()`,
      })
      .where(eq(profiles.userId, req.session.userId!));

    res.json(ok({ message: `OTP sent via ${method}` }));
  },
);

// POST /api/me/verification/verify
app.post(
  "/api/me/verification/verify",
  requireRole("seller"),
  async (req, res) => {
    const { otp } = z.object({ otp: z.string() }).parse(req.body);

    // Verify OTP...
    const isValid = await verifyOTP(req.session.userId!, otp);

    if (!isValid) {
      return res.json(error("INVALID_OTP", "OTP is incorrect or expired"));
    }

    await db
      .update(profiles)
      .set({
        verificationStatus: "verified",
        verifiedAt: new Date(),
        updatedAt: sql`now()`,
      })
      .where(eq(profiles.userId, req.session.userId!));

    res.json(ok({ verified: true }));
  },
);

// GET /api/admin/verification-requests
app.get(
  "/api/admin/verification-requests",
  requireRole("admin"),
  async (req, res) => {
    const requests = await db
      .select()
      .from(profiles)
      .where(eq(profiles.verificationStatus, "pending"))
      .orderBy(desc(profiles.updatedAt))
      .limit(50);

    res.json(ok({ requests }));
  },
);

// PATCH /api/admin/verification/:userId/approve
app.patch(
  "/api/admin/verification/:userId/approve",
  requireMasterAdmin,
  async (req, res) => {
    const userId = Number(req.params.userId);

    await db
      .update(profiles)
      .set({
        verificationStatus: "verified",
        verifiedAt: new Date(),
        updatedAt: sql`now()`,
      })
      .where(eq(profiles.userId, userId));

    // Log audit
    await db.insert(adminAuditLogs).values({
      adminId: req.session.userId!,
      action: "verification_approved",
      targetUserId: userId,
      details: {},
      createdAt: new Date(),
    });

    res.json(ok({ message: "Verified" }));
  },
);
```

**Step 4: Type Definitions (Frontend)**

```typescript
// client/src/lib/api.ts

export type Profile = {
  // ... existing fields ...
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  verificationMethod: "none" | "whatsapp_otp" | "email" | "manual";
  verificationRejectedReason?: string;
  verifiedAt?: string;
};

// Add to api client
export const api = {
  // ... existing endpoints ...

  requestVerification: async (method: "whatsapp_otp" | "email") => {
    return request<{ message: string }>(
      "POST",
      "/api/me/verification/request",
      { method },
    );
  },

  verifyOTP: async (otp: string) => {
    return request<{ verified: boolean }>(
      "POST",
      "/api/me/verification/verify",
      { otp },
    );
  },
};
```

**Step 5: React Component**

```typescript
// client/src/components/VerificationWidget.tsx

import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Props = {
  profile: Profile;
  onVerified: () => void;
};

export function VerificationWidget({ profile, onVerified }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'method' | 'code'>('method');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (profile.verificationStatus === 'verified') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium text-green-700">Verified seller</span>
      </div>
    );
  }

  if (profile.verificationStatus === 'pending') {
    return (
      <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
        <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
        <span className="text-sm font-medium text-yellow-700">Verification pending</span>
      </div>
    );
  }

  const handleRequestOTP = async () => {
    try {
      setLoading(true);
      await api.requestVerification(selectedMethod as any);
      setStep('code');
      toast.success(`OTP sent to your ${selectedMethod}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      await api.verifyOTP(otp);
      setOpen(false);
      onVerified();
      toast.success('You are now verified!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Verify Account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get Verified Badge</DialogTitle>
          </DialogHeader>

          {step === 'method' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose how we should verify you
              </p>

              <Button
                variant={selectedMethod === 'whatsapp_otp' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setSelectedMethod('whatsapp_otp')}
              >
                WhatsApp OTP
              </Button>

              <Button
                variant={selectedMethod === 'email' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setSelectedMethod('email')}
              >
                Email
              </Button>

              <Button
                onClick={handleRequestOTP}
                disabled={!selectedMethod || loading}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                Send OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the OTP sent to your {selectedMethod}
              </p>

              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
              />

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || loading}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                Verify
              </Button>

              <Button
                variant="ghost"
                onClick={() => setStep('method')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Step 6: Display Verification Badge**

```typescript
// client/src/components/SellerCard.tsx

export function SellerCard({ seller }: Props) {
  return (
    <div className="flex items-start gap-3">
      <img
        src={seller.avatarUrl}
        alt={seller.displayName}
        className="w-12 h-12 rounded-full"
      />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{seller.displayName}</h3>
          {seller.verificationStatus === 'verified' && (
            <BadgeCheck className="w-4 h-4 text-blue-500" title="Verified Seller" />
          )}
        </div>

        <p className="text-sm text-gray-600">{seller.bio}</p>
      </div>
    </div>
  );
}
```

---

## 2. Scaling Considerations

### When You Hit 10,000 Users

**Problem:** Single database connection pool saturated

**Solution:**

```typescript
// server/db.ts
import { Pool } from "pg";

// Increase pool size
const pool = new Pool({
  host: process.env.DATABASE_URL,
  max: 20, // Increase from default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### When You Hit 100,000 Reviews

**Problem:** Review queries slow down, analytics aggregation takes time

**Solution:**

```typescript
// 1. Add materialized view for aggregates
CREATE MATERIALIZED VIEW profile_review_stats AS
SELECT
  sellerId,
  COUNT(*) as total_reviews,
  AVG(rating) as avg_rating,
  COUNT(CASE WHEN isHidden THEN 1 END) as hidden_count
FROM reviews
GROUP BY sellerId;

CREATE INDEX profile_stats_seller ON profile_review_stats(sellerId);

// 2. Refresh periodically
REFRESH MATERIALIZED VIEW profile_review_stats;

// 3. Use in queries instead of calculating
const [stats] = await db.select()
  .from(profile_review_stats)
  .where(eq(profile_review_stats.sellerId, sellerId));
```

### When You Need Multi-Instance Deployment

**Current:** Express.js monolithic (works on single machine)

**Problem:** Sessions not shared across instances

**Solution:** Use Redis session store

```typescript
// server/index.ts
import RedisStore from "connect-redis";
import { createClient } from "redis";

const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: true, // In production
    },
  }),
);
```

### When You Need Read Replicas (1M+ queries/day)

**Strategy:**

```typescript
// server/db.ts
const primaryDb = drizzle(primaryPool);  // Production DB
const replicaDb = drizzle(replicaPool);  // Read-only replica

// Use replica for reads
const reviews = await replicaDb.select()
  .from(reviews)
  .where(...)

// Use primary for writes
await primaryDb.update(profiles)
  .set(...)
```

---

## 3. Common Implementation Patterns

### Pattern 1: Soft Deletes (Archive Instead of Delete)

```typescript
// shared/schema.ts
export const reviews = pgTable("reviews", {
  // ... fields ...
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedReason: text("archived_reason"),
});

// Add index for soft delete queries
export const reviewsActiveIndex = index("reviews_active_idx").on(
  reviews.sellerId,
  reviews.isArchived,
);

// Usage:
const activeReviews = await db
  .select()
  .from(reviews)
  .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isArchived, false)));

// Archive instead of delete
await db
  .update(reviews)
  .set({
    isArchived: true,
    archivedAt: new Date(),
    archivedReason: "User requested removal",
  })
  .where(eq(reviews.id, reviewId));
```

### Pattern 2: Event-Driven Actions (Notifications)

```typescript
// server/routes.ts

async function createReview(req, res) {
  // 1. Validate
  // 2. Create review in DB
  const [newReview] = await db.insert(reviews)
    .values({ ... })
    .returning();

  // 3. Create notification event
  await db.insert(notifications).values({
    userId: sellerId,
    type: 'review_received',
    relatedId: newReview.id,
    title: `New review from ${buyerName}`,
    message: `"${comment}"`,
    read: false,
    createdAt: new Date()
  });

  // 4. Optional: Emit real-time event (WebSocket)
  io.to(`user:${sellerId}`).emit('notification', {
    type: 'review_received',
    reviewId: newReview.id
  });

  res.json(ok({ review: newReview }));
}
```

### Pattern 3: Pagination with Filters

```typescript
// server/routes.ts

app.get("/api/admin/reviews", requireRole("admin"), async (req, res) => {
  const {
    cursor,
    limit = 20,
    sellerId,
    minRating = 0,
    maxRating = 5,
    isHidden,
  } = req.query;

  // Build WHERE clause
  const whereConditions = [];

  if (sellerId) {
    whereConditions.push(eq(reviews.sellerId, Number(sellerId)));
  }

  if (minRating || maxRating) {
    whereConditions.push(
      and(
        gte(reviews.rating, Number(minRating)),
        lte(reviews.rating, Number(maxRating)),
      ),
    );
  }

  if (isHidden !== undefined) {
    whereConditions.push(eq(reviews.isHidden, isHidden === "true"));
  }

  // Fetch limit + 1 to detect hasMore
  const items = await db
    .select()
    .from(reviews)
    .where(whereConditions.length ? and(...whereConditions) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(Number(limit) + 1)
    .offset(Number(cursor || 0));

  const hasMore = items.length > Number(limit);
  const result = items.slice(0, Number(limit));
  const nextCursor = hasMore ? Number(cursor || 0) + Number(limit) : null;

  res.json(
    ok({
      items: result,
      pagination: { cursor: nextCursor, hasMore },
    }),
  );
});
```

### Pattern 4: Bulking Operations

```typescript
// server/routes.ts

// OLD: Update each link individually (N queries)
// await Promise.all(reorderedIds.map(id =>
//   db.update(links).set({ sortOrder: ... }).where(eq(links.id, id))
// ));

// NEW: Atomic bulk update (1 query)
app.patch("/api/me/links/reorder", requireRole("seller"), async (req, res) => {
  const { orderedIds } = z
    .object({
      orderedIds: z.array(z.number()),
    })
    .parse(req.body);

  // Verify all links belong to user
  const linkCount = await db
    .select({ count: sql`count(*)::int` })
    .from(links)
    .where(
      and(eq(links.userId, req.session.userId!), inArray(links.id, orderedIds)),
    );

  if (linkCount[0].count !== orderedIds.length) {
    return res.json(error("FORBIDDEN", "Some links not owned by user"));
  }

  // Atomic update with CASE WHEN
  await db
    .update(links)
    .set({
      sortOrder: sql.raw(
        `CASE ${orderedIds
          .map((id, idx) => `WHEN id = ${id} THEN ${idx}`)
          .join(" ")} ELSE sort_order END`,
      ),
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(links.userId, req.session.userId!), inArray(links.id, orderedIds)),
    );

  res.json(ok({ message: "Reordered successfully" }));
});
```

---

## 4. Debugging Common Issues

### Issue: Session Lost After 24 Hours

**Cause:** Session expiration not configured

**Fix:**

```typescript
// server/index.ts
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
    },
  }),
);
```

### Issue: Avatar Upload Fails with 413 Entity Too Large

**Cause:** Express body parser limit too small

**Fix:**

```typescript
// server/index.ts
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

### Issue: Reviews Not Showing After Creation

**Cause:** Race condition - querying before commit

**Fix:**

```typescript
// Ensure transaction completes
const [review] = await db.insert(reviews)
  .values({ ... })
  .returning();

// Don't query immediately - wait for replication
await new Promise(resolve => setTimeout(resolve, 100));

// Then query
const created = await db.select().from(reviews)
  .where(eq(reviews.id, review.id)).limit(1);
```

### Issue: Admin Panel Slow with 100K Reviews

**Cause:** Full table scan without proper indexing

**Fix:**

```typescript
// Verify indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'reviews';

// Add missing indexes
CREATE INDEX reviews_seller_hidden_created_idx
ON reviews(sellerId, isHidden, createdAt DESC);

// Use index hint in query
db.select()
  .from(reviews)
  .where(
    and(
      eq(reviews.isHidden, false),
      eq(reviews.sellerId, sellerId)
    )
  )
  .orderBy(desc(reviews.createdAt))
```

---

## 5. Migration Checklist for Production Deployment

### Pre-Deployment

- [ ] Environment variables set on production server
- [ ] PostgreSQL database created and migrated (`npm run db:push`)
- [ ] R2 bucket created and credentials verified
- [ ] Google OAuth credentials added to console
- [ ] HTTPS certificate installed
- [ ] SESSION_SECRET generated (random 32+ char string)
- [ ] DATABASE_URL has SSL mode enabled

### Build & Test

- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run build` succeeds
- [ ] `npm start` runs without errors
- [ ] Test login flow (local auth)
- [ ] Test Google OAuth flow
- [ ] Test avatar upload
- [ ] Test review creation

### Monitoring

- [ ] Error tracking set up (Sentry)
- [ ] Logs being captured
- [ ] Database connection pool monitored
- [ ] Disk space monitored
- [ ] Memory usage monitored

### Backup

- [ ] PostgreSQL automated backups enabled
- [ ] R2 versioning enabled
- [ ] Code repository backed up

---

## 6. Performance Tuning Checklist

### Database Level

- [ ] Vacuum + analyze scheduled daily
- [ ] Unused indexes identified and removed
- [ ] Table statistics up-to-date
- [ ] Slow query log monitored
- [ ] Query execution plans reviewed

### Application Level

- [ ] React Query cache settings optimized
- [ ] API response times < 200ms (p99)
- [ ] Image sizes compressed (WebP, <100KB)
- [ ] Rate limiting configured
- [ ] Unnecessary queries removed

### Infrastructure Level

- [ ] Enable gzip compression
- [ ] CDN configured for static assets
- [ ] Database connection pool tuned
- [ ] Memory limits set
- [ ] CPU usage monitored

---

**End of Implementation & Expansion Guide**
