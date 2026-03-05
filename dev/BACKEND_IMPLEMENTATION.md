# Seller Account Setup Experience - Backend Implementation

## Overview

Implemented comprehensive backend for buyer/seller account setup flow with role selection, username management, and 30-day cooldown for username changes.

## Phase 2: Backend Completion Status

### ✅ Completed Work

#### 1. Schema & Validation Updates

- **File**: `shared/schema.ts`
  - Updated `userRoleEnum` from `["user", "seller", "admin"]` to `["buyer", "seller", "admin"]`
  - Added `lastUsernameChangedAt: Date | null` field to users table for cooldown tracking
  - Username field: unique, not null, lowercase enforced at app level

#### 2. Validation Schemas (server/routes.ts)

- **USERNAME_REGEX**: `/^[a-z0-9._-]{5,20}$/`
  - Lowercase only, 5-20 characters
  - Allowed special chars: dots, underscores, hyphens
  - No spaces or uppercase

- **DISPLAYNAME_REGEX**: `/^[\p{L}\p{N}\s\-_.,!?'"()]+$/u`
  - Unicode-aware, rejects emojis
  - Allows 2-50 characters
  - Supports international characters

- **Zod Validators**:
  - `usernameSchema`: Validates format, length, lowercase requirement
  - `displayNameSchema`: Validates format, emoji rejection via regex
  - `registerSchema`: Enforces password confirmation, role-conditional username (required for sellers only)
  - `changeUsernameSchema`: Validates new username format
  - `onboardingSchema`: Optional fields for profile completion

#### 3. API Endpoints

##### POST /api/auth/register (Updated)

**Accepts**: `{ email, password, confirmPassword, displayName, role: "buyer" | "seller", username?: string, avatarUrl?: string }`

**Logic**:

- Validates all inputs via Zod schemas
- Email uniqueness check (1 DB query)
- For sellers: validates username, checks uniqueness (1 DB query)
- For buyers: generates placeholder username via `generateUniqueUsername()`
- Sets default avatar to dicebear preset if not provided: `https://api.dicebear.com/7.x/avataaars/svg?seed={userId}`
- Creates user + profile atomically
- Returns: `{ user: { id, username, role, createdAt }, profile: { displayName, avatarUrl } }`

**Query Optimization**: 2 DB queries max (email check + optional username check)

---

##### GET /api/username/check

**Query Params**: `?username=<requested_username>`

**Response if available**:

```json
{
  "ok": true,
  "data": {
    "available": true,
    "suggestions": []
  }
}
```

**Response if taken**:

```json
{
  "ok": true,
  "data": {
    "available": false,
    "suggestions": ["myname1", "myname2", "myname_1", ...]
  }
}
```

**Features**:

- Format validation before DB check
- Returns up to 5 alternative suggestions if username taken
- Suggestions algorithm:
  1. Try numeric suffixes (myname1, myname2, ...)
  2. Try underscore suffixes (myname_1, myname_2, ...)
  3. Try shortened + suffix if base > 5 chars

**Query Optimization**: 2 DB queries max (validation + suggestions batch)

---

##### PATCH /api/me/username

**Requires**: Authentication (session.userId)

**Request Body**: `{ username: string }`

**Logic**:

- Validates username format
- Checks seller role (only sellers can change username)
- Enforces 30-day cooldown: Compares `lastUsernameChangedAt + 30 days` vs current date
- Returns 429 (Too Many Requests) with `daysUntilEligible` and `nextAvailableAt` if cooldown active
- Verifies new username is available (unique per user)
- Updates username + `lastUsernameChangedAt` atomically

**Response on success**:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 123,
      "username": "newusername",
      "lastUsernameChangedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

**Response on cooldown**:

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Username change cooldown active",
    "details": {
      "daysUntilEligible": 25,
      "nextAvailableAt": "2025-02-10T08:45:12.000Z"
    }
  }
}
```

---

##### PATCH /api/me/onboarding

**Requires**: Authentication (session.userId)

**Request Body**: `{ displayName?: string, avatarUrl?: string, username?: string, role?: "buyer" | "seller" }`

**Logic**:

- Allows profile completion with optional fields
- If `role === "seller"` and user is currently buyer:
  - Requires username in request
  - Validates username format + uniqueness
  - Updates user.role to "seller" and sets username
- Updates profile fields (displayName, avatarUrl) if provided
- Returns complete user + profile data

**Response**:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 123,
      "username": "mysellername",
      "role": "seller",
      "email": "seller@example.com"
    },
    "profile": {
      "displayName": "My Display Name",
      "avatarUrl": "https://..."
    }
  }
}
```

---

### 🔧 Helper Functions

#### generateUsernameSuggestions(requestedUsername, count = 5)

**File**: `server/user-helpers.ts`

**Purpose**: Generate available username alternatives

**Algorithm**:

1. Normalize username (lowercase, remove invalid chars, trim special chars from edges)
2. Try numeric suffixes first (base1, base2, ...)
3. Try underscore variants (base_1, base_2, ...)
4. Try shortened versions with suffix (if base > 5 chars)
5. Return first 5 available options

**Efficiency**: Max 3\*count DB queries (but short-circuits if enough found)

---

### 📝 Supporting Changes

#### auth.ts (Google OAuth)

- Updated: Changed default role from `"user"` to `"buyer"` for new Google OAuth users
- Line 77: `role: "buyer"` ✅

#### storage.ts (Mock Storage)

- Updated: Added `lastUsernameChangedAt: null` initialization for new users
- Note: Cooldown only applies to authenticated flow; mock is for testing

#### tsconfig.json

- Added: `"target": "ES2020"` to support Unicode regex flag (`/u`)

#### routes.ts (Existing Endpoints)

- Updated: `app.patch("/api/me/role")` - Changed enum from `["user", "seller"]` to `["buyer", "seller"]`

---

## Data Flow

### Buyer Signup Flow

```
1. POST /api/auth/register { email, password, displayName, role: "buyer" }
   ↓
2. Validate displayName, email, password
   ↓
3. Check email uniqueness (1 query)
   ↓
4. Generate placeholder username (e.g., "john_doe_1234")
   ↓
5. Create user record with role="buyer", username=placeholder
   ↓
6. Create profile record with displayName, avatarUrl=dicebear preset
   ↓
7. Return user + profile
```

### Seller Signup Flow

```
1. POST /api/auth/register { email, password, displayName, role: "seller", username, avatarUrl? }
   ↓
2. Validate displayName, email, password, username
   ↓
3. Check email uniqueness (1 query)
   ↓
4. Check username uniqueness (1 query)
   ↓
5. Create user record with role="seller", username=provided
   ↓
6. Create profile record with displayName, avatarUrl=provided or dicebear
   ↓
7. Return user + profile
```

### Username Change Flow

```
1. PATCH /api/me/username { username }
   ↓
2. Retrieve user (require auth)
   ↓
3. Verify role === "seller"
   ↓
4. Check cooldown: lastUsernameChangedAt + 30 days > now?
   ↓
5. Check username uniqueness (1 query)
   ↓
6. Update username + lastUsernameChangedAt
   ↓
7. Return updated user
```

---

## Performance Notes

### Query Optimization

- Register endpoint: 2 queries (email check + optional username check)
- Username check: 2 queries max (format validation + suggestions)
- Username change: 2 queries (uniqueness check + update)
- Onboarding: 1-3 queries (max: user lookup + username check + profile update)

### Database Indexes

Uses existing indexes + new seller-specific ones (from Phase 1 optimization)

---

## Error Handling

### Standard Error Response Format

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // optional
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Input validation failed (400)
- `UNAUTHORIZED`: Not signed in (401)
- `NOT_FOUND`: User not found (404)
- `CONFLICT`: Username already taken (409)
- `RATE_LIMIT`: Cooldown active (429)
- `FORBIDDEN`: Insufficient permissions (403)

---

## Testing Checklist

### Unit Tests (Suggested)

- [ ] Username validation regex: lowercase only, length, special chars
- [ ] DisplayName validation: emoji rejection, length
- [ ] Password confirmation matching
- [ ] Username suggestion generation algorithm

### Integration Tests (Suggested)

- [ ] Buyer signup: no username required, placeholder generated
- [ ] Seller signup: username required and unique
- [ ] Seller username change success within cooldown window
- [ ] Seller username change rejection outside cooldown window
- [ ] Onboarding: buyer → seller upgrade with new username
- [ ] Avatar defaulting to dicebear if not provided
- [ ] Email uniqueness enforcement

### API Tests (Suggested with cURL/Postman)

- [ ] GET /api/username/check?username=taken → returns suggestions
- [ ] GET /api/username/check?username=available → returns available: true
- [ ] PATCH /api/me/username within cooldown → returns 429 with daysUntilEligible
- [ ] PATCH /api/me/username after cooldown → success
- [ ] PATCH /api/me/onboarding with seller role → creates username

---

## Next Steps

### Frontend Implementation (Not Started)

1. **Signup Page**
   - Role selector (buyer/radio seller)
   - Conditional username field (show only if seller selected)
   - Debounced username availability check via GET /api/username/check
   - Password confirmation validation in real-time
   - Avatar upload or preset selection

2. **Avatar Picker Component**
   - Display 8-12 dicebear presets
   - Option to upload custom avatar via existing POST /api/me/avatar endpoint
   - Preview of selected avatar

3. **Dashboard Onboarding Wizard**
   - Detect incomplete profiles (sellers missing username/avatar/displayName)
   - Show blocking modal with missing fields
   - Call PATCH /api/me/onboarding on completion
   - Auto-redirect to profile on completion

4. **Client API Helpers**
   - `checkUsernameAvailability(username): Promise<{ available, suggestions }>`
   - `changeUsername(username): Promise<User>`
   - `completeOnboarding(fields): Promise<{ user, profile }>`

### Google OAuth Integration (Not Started)

- Modify callback handler to show role selection for first-time users
- Store role choice
- Redirect to avatar selection page if seller role chosen

---

## Files Modified

### Core Implementation

- ✅ `server/routes.ts` - 3 new endpoints + register update + schemas
- ✅ `server/user-helpers.ts` - `generateUsernameSuggestions()` function
- ✅ `shared/schema.ts` - Already had updates from Phase 1

### Consistency Updates

- ✅ `server/auth.ts` - Updated Google OAuth default role
- ✅ `server/storage.ts` - Added `lastUsernameChangedAt` field
- ✅ `tsconfig.json` - Added ES2020 target for regex support

### Not Modified (Frontend)

- ⏳ `client/src/pages/auth.tsx` - Signup page
- ⏳ `client/src/components/` - Avatar picker, onboarding wizard
- ⏳ `client/src/lib/api.ts` - Client helpers

---

## TypeScript & Build Status

✅ **npm run check**: No errors  
✅ **npm run build**: Successful (1.2mb bundle)

## Last Updated

Phase 2 Backend Implementation - Seller Account Setup Experience
