# MiddelMen – API_SPEC.md

Version: v1 (Reputation Layer)
Last Updated: 2026-02-17

Base URL: /api  
Content-Type: application/json  
Auth Model: Cookie-based session (recommended)

All frontend requests MUST use:
fetch(url, { credentials: "include" })

---

0. GLOBAL RESPONSE FORMAT

---

All successful responses:

{
"ok": true,
"data": { ... }
}

All error responses:

{
"ok": false,
"error": {
"code": "ERROR_CODE",
"message": "Human readable message",
"details": {}
}
}

---

## HTTP STATUS CODES

200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
429 Too Many Requests
500 Internal Server Error

---

1. DATA STRUCTURES

---

User (public safe)

{
"id": 1,
"username": "sellername",
"role": "user",
"createdAt": "2026-02-17T12:34:56.000Z"
}

Profile

{
"userId": 1,
"displayName": "Seller Name",
"bio": "Short seller bio",
"avatarUrl": "https://...",
"instagramHandle": "seller.ig",
"whatsappNumber": "+9715XXXXXXX",
"isVerified": false,
"verificationMethod": "none",
"createdAt": "...",
"updatedAt": "..."
}

Link

{
"id": 100,
"userId": 1,
"title": "Shop Catalog",
"url": "https://...",
"isActive": true,
"sortOrder": 0,
"createdAt": "...",
"updatedAt": "..."
}

Review

{
"id": 200,
"sellerId": 1,
"authorName": "Buyer",
"rating": 5,
"comment": "Great experience!",
"isHidden": false,
"createdAt": "..."
}

Stats

{
"avgRating": 4.6,
"totalReviews": 52
}

---

2. PUBLIC ENDPOINTS

---

---

## GET /api/profile/:username

Returns seller profile + stats.

Response 200:

{
"ok": true,
"data": {
"user": { ...User },
"profile": { ...Profile },
"stats": { ...Stats }
}
}

Errors:
404 PROFILE_NOT_FOUND

---

## GET /api/profile/:userId/links

Returns only active links sorted by sortOrder ASC.

Response 200:

{
"ok": true,
"data": {
"links": [ ...Link ]
}
}

---

## GET /api/profile/:username/reviews

Returns non-hidden reviews sorted by createdAt DESC.

Response 200:

{
"ok": true,
"data": {
"reviews": [ ...Review ],
"stats": { ...Stats }
}
}

---

## GET /api/profile/:username/bundle

**Optimized endpoint** – Returns all profile data in a single request (user, profile, links, reviews, stats).

Query params:

- track=1 (optional) – Record profile view analytics if set
- limit (default 50, max 100) – Pagination size for reviews
- cursor (number) – Pagination cursor (review ID from nextCursor)

Response 200:

```json
{
  "ok": true,
  "data": {
    "user": { ...User },
    "profile": { ...Profile },
    "links": [ ...Link ],
    "reviews": [ ...Review ],
    "stats": { ...Stats },
    "isOwner": false,
    "nextCursor": 195  // omitted if no more reviews
  }
}
```

**Performance**: Uses 4 parallel DB queries (profile, links, reviews, stats). Eliminates 3-request waterfall.

**Pagination**: Cursor-based on reviews. If `nextCursor` is present, fetch next page with `?cursor=<nextCursor>`.

---

## POST /api/profile/:userId/reviews

Creates a review.

Body:

{
"authorName": "Buyer Name",
"rating": 5,
"comment": "Great experience!"
}

Validation:

- authorName: 2–50 chars
- rating: integer 1–5
- comment: 1–500 chars

Anti-spam requirements:

- Hash IP: sha256(ip + REVIEW_HASH_SALT)
- Max 3 reviews per 24h per seller per ipHash
- Reject duplicate comment from same ipHash in 24h

Success 201:

{
"ok": true,
"data": {
"review": { ...Review }
}
}

Errors:
400 VALIDATION_ERROR
404 SELLER_NOT_FOUND
429 REVIEW_RATE_LIMITED

---

## GET /api/search?query=...

Search by:

- username
- displayName
- instagramHandle

Response 200:

{
"ok": true,
"data": {
"results": [
{
"user": { ...User },
"profile": { ...Profile },
"stats": { ...Stats }
}
]
}
}

Limit: 20 results max

---

3. AUTH ENDPOINTS

---

---

## POST /api/auth/register

Body:

{
"username": "sellername",
"email": "email@email.com",
"password": "strongpassword"
}

Validation:

- username: 3–20 chars, alphanumeric + . \_ -
- email: valid format
- password: minimum 8 chars

Behavior:

- bcrypt hash password
- create user
- create empty profile row
- set session cookie

Success 201:

{
"ok": true,
"data": {
"user": { ...User }
}
}

Errors:
409 USERNAME_TAKEN
409 EMAIL_TAKEN

---

## POST /api/auth/login

Body:

{
"usernameOrEmail": "sellername",
"password": "password"
}

Success 200:

{
"ok": true,
"data": {
"user": { ...User }
}
}

Errors:
401 INVALID_CREDENTIALS

---

## POST /api/auth/logout

Success 200:

{
"ok": true,
"data": { "loggedOut": true }
}

---

## GET /api/me

Auth required.

Success 200:

{
"ok": true,
"data": {
"user": { ...User },
"profile": { ...Profile }
}
}

Error:
401 UNAUTHORIZED

---

## GET /api/auth/google

Redirect to Google OAuth consent screen.

---

## GET /api/auth/google/callback

Behavior:

- Create or link user
- Set session cookie
- Redirect to /dashboard

Errors:
500 GOOGLE_OAUTH_FAILED

---

4. SELLER DASHBOARD ENDPOINTS (Auth Required)

---

---

## PATCH /api/me/profile

Body (all optional):

{
"displayName": "Seller Name",
"bio": "Bio",
"avatarUrl": "https://...",
"instagramHandle": "seller.ig",
"whatsappNumber": "+9715XXXXXXX"
}

Validation:

- displayName 2–50
- bio max 160
- instagramHandle 2–30
- whatsappNumber E.164 format

Success 200:

{
"ok": true,
"data": {
"profile": { ...Profile }
}
}

Error:
409 INSTAGRAM_HANDLE_TAKEN

---

## POST /api/me/links

Body:

{
"title": "Shop",
"url": "https://..."
}

Validation:

- title 1–40
- valid https URL

Success 201:

{
"ok": true,
"data": {
"link": { ...Link }
}
}

---

## PATCH /api/me/links/:id

Body:

{
"title": "New title",
"url": "https://...",
"isActive": true,
"sortOrder": 1
}

Success 200:

{
"ok": true,
"data": {
"link": { ...Link }
}
}

Errors:
404 LINK_NOT_FOUND
403 FORBIDDEN

---

## DELETE /api/me/links/:id

Success 200:

{
"ok": true,
"data": { "deleted": true }
}

---

## PATCH /api/me/reviews/:id/toggle-hidden

Body:

{
"isHidden": true
}

Success 200:

{
"ok": true,
"data": {
"review": { ...Review }
}
}

---

5. ADMIN ENDPOINTS (Role = admin)

---

---

## GET /api/admin/reviews

Query params:

- sellerId (number)
- hidden=true/false
- limit (default 100, max 500) – pagination size
- cursor (number) – pagination cursor (review ID from nextCursor)

Response 200:

```json
{
  "ok": true,
  "data": {
    "reviews": [ ...Review ],
    "nextCursor": 195  // omitted if no more results
  }
}
```

**Pagination**: Cursor-based. If `nextCursor` is present, pass it as `?cursor=<nextCursor>` in the next request. Uses review IDs as cursors.

---

## PATCH /api/admin/reviews/:id/hide

Body:

{
"isHidden": true
}

---

## PATCH /api/admin/users/:id/role

Body:

{
"role": "admin"
}

---

6. SECURITY REQUIREMENTS

---

- Never return passwordHash
- Never store raw IP (only hashed)
- Validate all inputs with Zod
- Enforce role checks on protected routes
- Rate limit review creation
- Limit search results to 20
- Sanitize strings before storage
- Use secure cookies in production

---

7. ENVIRONMENT VARIABLES REQUIRED

---

DATABASE_URL=
SESSION_SECRET=
REVIEW_HASH_SALT=
APP_URL=

Optional (Google OAuth):
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

---

8. ACCEPTANCE CHECKLIST (v1 COMPLETE WHEN:)

---

[ ] Seller can register/login
[ ] Seller can edit profile
[ ] Seller can add/edit/delete links
[ ] Public can view profile
[ ] Public can leave review
[ ] Rate limit blocks spam
[ ] Seller can hide reviews
[ ] Search works
[ ] Deployed with persistent database
[ ] No mock/localStorage data in production

---

## END OF FILE
