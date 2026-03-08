# Code Examples & Architecture Deep Dive

## MiddelMen Technical Reference

---

## 1. Request Flow Visualization

### Avatar Upload Flow (Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER - React Component (dashboard.tsx)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User selects file from <input type="file" />               │
│  2. onChange handler triggered:                                │
│     const file = e.target.files[0]                             │
│                                                                 │
│  3. Client-side validation:                                    │
│     - Check MIME type (image/jpeg, image/png, image/webp)     │
│     - Check file size < 5MB                                    │
│     - If validation fails: toast error, return                 │
│                                                                 │
│  4. Canvas compression (client/src/lib/avatar.ts):             │
│     const compressed = await compressAvatar(file)              │
│     - Load image onto canvas                                   │
│     - Resize to 256×256 (center crop)                          │
│     - Export as WebP quality 0.8                               │
│     - Result: smaller File object (<100KB expected)            │
│                                                                 │
│  5. Create FormData:                                           │
│     const fd = new FormData()                                  │
│     fd.append('avatar', compressed)                            │
│                                                                 │
│  6. Send to server:                                            │
│     fetch('/api/me/avatar', {                                  │
│       method: 'POST',                                          │
│       body: fd,                                                │
│       credentials: 'include'  // ← Important! Include cookie   │
│     })                                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ NETWORK - HTTP POST /api/me/avatar                              │
├─────────────────────────────────────────────────────────────────┤
│ Headers:                                                        │
│   Content-Type: multipart/form-data; boundary=...              │
│   Cookie: connect.sid=...                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVER - Express Middleware Stack (server/index.ts)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. express.json()                                              │
│     - Skip (multipart request)                                 │
│                                                                 │
│  2. express.session({                                          │
│       store: new Pool(connectionConfig),  // PostgreSQL        │
│       secret: SESSION_SECRET,                                  │
│       cookie: { httpOnly: true, sameSite: 'lax' }             │
│     })                                                         │
│     - Parse connect.sid cookie                                 │
│     - Load session from PostgreSQL                             │
│     - Deserialize user: req.session.userId = 42               │
│                                                                 │
│  3. passport.initialize()                                      │
│     passport.session()                                         │
│     - Load user via deserializeUser                            │
│     - Set req.user = { id: 42, role: 'seller', ... }          │
│                                                                 │
│  4. app.post('/api/me/avatar',                                 │
│       upload.single('avatar'),          // Multer middleware   │
│       handleAvatarUpload)                                      │
│     - Multer parses multipart body                             │
│     - Validates MIME type                                      │
│     - Stores in memory: req.file                               │
│     - If invalid: req.file undefined                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Route Handler (server/routes.ts, line 665)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  async function handleAvatarUpload(req, res) {                 │
│                                                                 │
│    // 1. Auth check                                            │
│    if (!req.session.userId) {                                  │
│      return res.json(error('UNAUTHORIZED', 'Login required')); │
│    }                                                           │
│                                                                 │
│    // 2. Validate file exists                                  │
│    if (!req.file) {                                            │
│      return res.json(error('VALIDATION_ERROR',                │
│        'No file provided'));                                   │
│    }                                                           │
│                                                                 │
│    // 3. Server-side reprocessing (never trust client):        │
│    try {                                                       │
│      const webpBuffer = await sharp(req.file.buffer)          │
│        .resize(256, 256, { fit: 'cover' })                    │
│        .webp({ quality: 80 })                                 │
│        .toBuffer()                                             │
│                                                                 │
│      // 4. Upload to Cloudflare R2                            │
│      const s3Client = new S3Client({                          │
│        region: 'auto',                                         │
│        credentials: {                                          │
│          accessKeyId: R2_ACCESS_KEY_ID,                       │
│          secretAccessKey: R2_SECRET_ACCESS_KEY                │
│        },                                                      │
│        endpoint: R2_ENDPOINT                                   │
│      })                                                        │
│                                                                 │
│      const key = `avatars/${req.session.userId}.webp`          │
│      const url = `${R2_PUBLIC_BASE_URL}/${key}?v=${Date.now()}`│
│                                                                 │
│      await s3Client.send(new PutObjectCommand({               │
│        Bucket: R2_BUCKET,                                      │
│        Key: key,                                               │
│        Body: webpBuffer,                                       │
│        ContentType: 'image/webp',                              │
│        CacheControl: 'immutable, max-age=31536000' // 1 year  │
│      }))                                                       │
│                                                                 │
│      // 5. Update database                                     │
│      await db.update(profiles)                                 │
│        .set({ avatarUrl: url, updatedAt: sql`now()` })       │
│        .where(eq(profiles.userId, req.session.userId))        │
│                                                                 │
│      // 6. Return response                                     │
│      res.json(ok({ avatarUrl: url }))                         │
│                                                                 │
│    } catch (err) {                                            │
│      console.error('Avatar upload failed:', err)              │
│      res.json(error('UPLOAD_ERROR',                           │
│        'Failed to process image'))                            │
│    }                                                           │
│  }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CLOUD - Cloudflare R2 Storage                                  │
├─────────────────────────────────────────────────────────────────┤
│ File stored at:                                                 │
│ s3://trust-bucket/avatars/42.webp                              │
│                                                                 │
│ Public URL:                                                     │
│ https://bucket.cloudflare.r2.dev/avatars/42.webp?v=1708...    │
│                                                                 │
│ Cache headers: immutable (browser caches for 1 year)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE - PostgreSQL (Neon)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Query executed:                                                 │
│ UPDATE profiles                                                 │
│ SET avatarUrl = 'https://...?v=1708...',                       │
│     updatedAt = NOW()                                          │
│ WHERE userId = 42                                              │
│                                                                 │
│ Result:                                                         │
│ profiles.avatarUrl = 'https://bucket.r2.dev/avatars/42...     │
│ profiles.updatedAt = 2026-02-23 14:33:00                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ HTTP Response                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Status: 200 OK                                                  │
│                                                                 │
│ {                                                               │
│   "ok": true,                                                  │
│   "data": {                                                    │
│     "avatarUrl": "https://bucket.r2.dev/avatars/42.webp..."   │
│   }                                                             │
│ }                                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER - React Update                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Mutation response received                                 │
│  2. Update React Query cache:                                  │
│     queryClient.setQueryData(['me'], (old) => ({              │
│       ...old,                                                  │
│       profile: {                                               │
│         ...old.profile,                                        │
│         avatarUrl: "https://..."                               │
│       }                                                         │
│     }))                                                        │
│                                                                 │
│  3. Component re-renders with new avatarUrl                    │
│  4. Avatar preview image updated instantly                     │
│  5. Toast success: "Avatar updated successfully"               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Code Examples

### 2.1 Authentication Flow

**Login Handler (server/routes.ts, line 607):**

```typescript
app.post("/api/auth/login", async (req, res) => {
  const bodySchema = z.object({
    usernameOrEmail: z.string().min(1),
    password: z.string().min(6),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.json(error("VALIDATION_ERROR", parsed.error.message));
  }

  const { usernameOrEmail, password } = parsed.data;

  // Find user by email or username (case-insensitive username)
  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(sql`lower(${users.username})`, usernameOrEmail.toLowerCase()),
        eq(users.email, usernameOrEmail),
      ),
    )
    .limit(1);

  // User not found
  if (!user) {
    return res.json(error("UNAUTHORIZED", "Invalid credentials"));
  }

  // Check if account is disabled
  if (user.isDisabled) {
    return res.json(
      error("ACCOUNT_DISABLED", `Account disabled: ${user.disabledReason}`, {
        disabledAt: user.disabledAt,
      }),
    );
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.json(error("UNAUTHORIZED", "Invalid credentials"));
  }

  // Set session
  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) {
      return res.json(error("SESSION_ERROR", "Failed to create session"));
    }

    res.json(
      ok({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
      }),
    );
  });
});
```

**Google OAuth Callback Handler (server/auth.ts):**

```typescript
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Look for existing user
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.emails?.[0]?.value || ""))
          .limit(1);

        if (existing) {
          // User exists, return it
          return done(null, existing);
        }

        // First time user, create account
        const username = await generateUniqueUsername(profile.displayName);

        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.emails?.[0]?.value,
            username: username,
            passwordHash: "", // OAuth users have no password
            role: "buyer", // Default to buyer (can upgrade to seller)
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create profile
        await db.insert(profiles).values({
          userId: newUser.id,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
          bio: "",
          theme: "light",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// Serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId: number, done) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  done(null, user);
});
```

### 2.2 Building Queries with Indexes

**Example 1: Fetch seller's active links (sorted)**

```typescript
// Uses index: links_user_active_sort_idx
const sellerLinks = await db
  .select({
    id: links.id,
    title: links.title,
    icon: links.icon,
    url: links.url,
    sortOrder: links.sortOrder,
    createdAt: links.createdAt,
    updatedAt: links.updatedAt,
  })
  .from(links)
  .where(and(eq(links.userId, sellerId), eq(links.isActive, true)))
  .orderBy(asc(links.sortOrder))
  .limit(50); // Prevent accidental large results
```

**Example 2: Get visible reviews by seller**

```typescript
// Uses index: reviews_seller_hidden_created_idx
const [visibleReviews, stats] = await Promise.all([
  db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      authorName: reviews.authorName,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(10)
    .offset(offset),

  // Aggregate stats
  db
    .select({
      avgRating: sql`AVG(${reviews.rating})::float4`,
      totalCount: sql`COUNT(*)::integer`,
    })
    .from(reviews)
    .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false))),
]);
```

**Example 3: Admin search users (pagination)**

```typescript
// Multi-field search with pagination
const query = searchTerm?.toLowerCase();
const [users, nextCursor] = await Promise.all([
  db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    role: users.role,
    isDisabled: users.isDisabled,
    createdAt: users.createdAt
  })
  .from(users)
  .where(
    query ? or(
      sql`lower(${users.username}) LIKE ${`%${query}%`}`,
      sql`lower(${users.email}) LIKE ${`%${query}%`}`,
      sql`CAST(${users.id} AS TEXT) = ${query}`
    ) : undefined
  )
  .orderBy(desc(users.createdAt))
  .limit(cursor ? 21 : 20) // Fetch one extra to detect hasMore
  .offset(cursor || 0),

  // Get next cursor
  db.select({ count: sql`COUNT(*)::integer` })
    .from(users)
    .where(query ? or(...) : undefined)
]);

// Determine if more results exist
const hasMore = users.length > 20;
const nextOffset = hasMore ? cursor + 20 : null;

return res.json(ok({
  users: users.slice(0, 20),
  pagination: {
    cursor: nextOffset,
    hasMore
  }
}));
```

### 2.3 React Query Usage

**Dashboard Analytics (lazy-loaded):**

```typescript
// client/src/pages/dashboard.tsx

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [analyticsDays, setAnalyticsDays] = useState(14);

  // Always fetch
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: api.getMe,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Only fetch when analytics tab is active
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', analyticsDays],
    queryFn: () => api.getAnalytics(analyticsDays),
    enabled: activeTab === 'analytics', // ← KEY: Conditional fetching
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.updateProfile(data),
    onSuccess: (newProfile) => {
      // Update cache without invalidation (no refetch)
      const queryClient = useQueryClient();
      queryClient.setQueryData(['me'], (old) => ({
        ...old,
        profile: newProfile
      }));
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileEditor
          profile={me?.profile}
          onUpdate={updateProfileMutation.mutate}
        />
      </TabsContent>

      <TabsContent value="analytics">
        {analyticsLoading ? (
          <Spinner />
        ) : (
          <AnalyticsChart data={analyticsData} />
        )}
      </TabsContent>
    </Tabs>
  );
}
```

**Dispute Creation with Evidence Upload:**

```typescript
const createDisputeMutation = useMutation({
  mutationFn: async ({
    reviewId,
    reason,
    evidenceFile,
  }: {
    reviewId: number;
    reason: string;
    evidenceFile?: File;
  }) => {
    // Step 1: Create dispute
    const dispute = await api.createDispute(reviewId, reason);

    // Step 2: If evidence provided, upload
    if (evidenceFile) {
      const formData = new FormData();
      formData.append("evidence", evidenceFile);

      await fetch(`/api/me/reviews/${reviewId}/dispute/evidence`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
    }

    return dispute;
  },
  onSuccess: (dispute) => {
    // Invalidate reviews query to refresh list
    queryClient.invalidateQueries(["me", "reviews"]);
    toast.success("Dispute created");
  },
  onError: (error) => {
    toast.error(`Failed to create dispute: ${error.message}`);
  },
});
```

### 2.4 Admin Authorization Patterns

**Middleware Check (server/routes.ts):**

```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(403).json(error("UNAUTHORIZED", "Login required"));
  }
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(403).json(error("UNAUTHORIZED", "Login required"));
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    // Check if account disabled
    if (user?.isDisabled) {
      return res
        .status(403)
        .json(error("ACCOUNT_DISABLED", "Account has been disabled"));
    }

    if (!roles.includes(user?.role)) {
      return res
        .status(403)
        .json(error("FORBIDDEN", "Insufficient permissions"));
    }

    next();
  };
}

function requireMasterAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    const [user] = await db
      .select({ isMasterAdmin: users.isMasterAdmin })
      .from(users)
      .where(eq(users.id, req.session.userId!))
      .limit(1);

    if (!user?.isMasterAdmin) {
      return res
        .status(403)
        .json(error("FORBIDDEN", "Master admin access required"));
    }

    next();
  });
}

// Usage:
app.get("/api/admin/users", requireRole("admin"), handleAdminUsers);
app.post("/api/admin/admins", requireMasterAdmin, handleCreateAdmin);
```

---

## 3. Architecture Diagrams

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USERS (Browsers)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Cloudflare CDN │
                    │ (Optional Cache)│
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          │        ┌─────────▼──────────┐      │
          │        │  Express.js Server  │      │
          │        │  (Port 5005)        │      │
          │        └─────────┬──────────┘      │
          │                  │                  │
    Client Bundle       ┌─────┴──────┐       Static
    (Vite built)        │             │       Files
                        │             │
    ┌───────────────────▼─────────────▼────────────────┐
    │           Express Middleware Stack                │
    │  ┌───────────────────────────────────────────┐   │
    │  │ 1. express.json()                         │   │
    │  │ 2. express-session (PostgreSQL store)     │   │
    │  │ 3. passport.initialize() + session()      │   │
    │  │ 4. Multer (multipart file handling)       │   │
    │  │ 5. Rate limiter                           │   │
    │  │ 6. Route handlers                         │   │
    │  └───────────────────────────────────────────┘   │
    └───────────────────┬────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │PostgreSQL│   │ R2 (S3) │   │ Passport│
    │(Drizzle) │   │ Storage │   │ (OAuth) │
    │  Neon    │   │Cloudflare│   │ Google  │
    │          │   │          │   │         │
    │  8 Tables│   │ Avatars  │   │         │
    │ 100K+ row│   │ Evidence │   │         │
    │          │   │Files     │   │         │
    └────┬─────┘   └─────────┘   └────────┘
         │
    ┌────▼──────────────────┐
    │  PostgreSQL Database  │
    │ (Neon Recommended)    │
    │                       │
    │ users                 │
    │ profiles              │
    │ links                 │
    │ reviews               │
    │ review_disputes       │
    │ profile_daily_stats   │
    │ admin_audit_logs      │
    │ notifications         │
    └───────────────────────┘
```

### 3.2 Data Model Relationships

```
┌─────────────┐
│   users     │─ 1:1 ──┬─→ profiles
│             │        │
│ id (PK)     │        │
│ username    │        │
│ email       │        │
│ passwordHash│        │
│ role        │        │
│ isDisabled  │        │
│ isMasterAd. │        │
└─────────────┘        │
       ▲                │
       │ 1:N            │
       │                │
    ┌──┴──────────┐   ┌┴──────────┐
    │             │   │ profiles  │
    │             │   │           │
    │             │   │ userId (FK)
    │             │   │ displayName│
    │             │   │ bio       │
    │             │   │ avatarUrl │
    │             │   │ theme     │
    │             │   └───────────┘
    │             │
    │      ┌──────┴──────┬──────────┐
    │      │             │          │
    │  1:N | 1:N         | 1:N      | 1:N
    │      │             │          │
   ┌┴──────▼──┐  ┌───────▼──┐  ┌──▼─────────┐
   │  links   │  │ reviews  │  │  notifications
   │          │  │          │  │
   │ userId   │  │ sellerId │  │ userId
   │ isActive │  │ reviewer │  │ type
   │sortOrder │  │ rating   │  │ read
   └──────────┘  │comment   │  └────────────┘
                 │isHidden  │
                 │disputed  │── 1:1 ──┐
                 └───┬──────┘         │
                     │               │
                  1:N|          ┌────▼───────────┐
                     │          │review_disputes │
                     │          │                │
                     ●──────────│ reviewId (FK)  │
          Disputed   └────────→ │ status         │
          review            ┌──→│resolvedBy    │
                            │   └────┬──────────┘
                            │        │
                            │  ┌─────▼─────────────┐
                            │  │dispute_evidence   │
                            │  │ (References in DB)│
                            │  │ (Files in R2)     │
                            │  └───────────────────┘
                            1:N

         ┌──────────────────────────────────┐
         │ profile_daily_stats              │
         │ (Aggregated analytics)           │
         │ userId, day (PK), views, clicks  │
         └──────────────────────────────────┘
                       ▲
                       │ 1:N
                       │ (written by POST /api/profile/:userId/click)
                       │
              [Daily stat aggregation]


         ┌──────────────────────────────────┐
         │ admin_audit_logs                 │
         │ (All admin actions)              │
         │ adminId, action, target, details │
         └──────────────────────────────────┘
```

### 3.3 Request Lifecycle for Protected Route

```
Request arrives: GET /api/me/analytics?days=14
                 Headers: { Cookie: connect.sid=... }
                        │
                        ▼
          Express Middleware Pipeline
                        │
        ┌───────────────┴───────────────┐
        │                               │
   express.json()              express-session
   (Skip - query param)         │
                            ┌───▼────────────┐
                            │ Parse connect. │
                            │ sid from cookie │
                            │                 │
                            │ Load from       │
                            │ PostgreSQL      │
                            │ session store   │
                            │                 │
                            │ req.session = {│
                            │  userId: 42    │
                            │ }              │
                            └───┬────────────┘
                                │
                      passport.initialize()
                                │
                      passport.session()
                                │
                            ┌───▼────────────────────┐
                            │ Call deserializeUser()  │
                            │ Find user by userId     │
                            │ req.user = { ...user }  │
                            └───┬────────────────────┘
                                │
                         Route Handler
                                │
                    ┌───────────▼────────────┐
                    │  requireAuth()         │
                    │  if (!req.session...)  │
                    │    return 403 error    │
                    │                        │
                    │  Continue ✓            │
                    └───────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │ handleGetAnalytics()    │
                   │                         │
                   │ SELECT from             │
                   │  profile_daily_stats    │
                   │ WHERE userId = 42       │
                   │  AND day >= NOW() - ... │
                   │ ORDER BY day DESC       │
                   └────────────┬────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Format response      │
                    │  {                    │
                    │   ok: true,           │
                    │   data: { days: [...] │
                    │  }                    │
                    └───────────┬───────────┘
                                │
                     Send to browser
                                │
                    Response received
```

---

## 4. Performance Checkpoint

### Query Performance Expectations

| Query                            | Index                               | Rows | Time   |
| -------------------------------- | ----------------------------------- | ---- | ------ |
| Get seller profile + stats       | (1:1)                               | -    | <5ms   |
| Get 10 active links by seller    | `links_user_active_sort_idx`        | 10   | <2ms   |
| Get 10 visible reviews by seller | `reviews_seller_hidden_created_idx` | 10   | <3ms   |
| Get seller's avatar              | (PK)                                | 1    | <1ms   |
| Admin search users (100 results) | (LIKE index)                        | 100  | 5-10ms |
| Get daily stats for 14 days      | PK                                  | 14   | <5ms   |
| Get all disputes (paginated)     | (index on status)                   | 20   | 5-15ms |

### Middleware Performance

- Session deserialization: <10ms
- Passport deserializeUser: <5ms
- Multer file parsing (5MB): ~50-100ms
- Sharp image processing (256x256): ~200-300ms
- R2 upload: ~500-1000ms (network dependent)

**Total Request Time:**

- Avatar upload: 1-2 seconds (dominated by R2 + network)
- Profile fetch: 10-20ms
- Review submission: 20-50ms

---

**End of Architecture & Code Examples Document**
