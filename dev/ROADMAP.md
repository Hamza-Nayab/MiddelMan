# MiddelMen – ROADMAP.md

Last Updated: 2026-02-17  
Product: MiddelMen (Trust + Reputation + Escrow layer for social-commerce sellers)

---

0. PRODUCT VISION

---

MiddelMen is a trust infrastructure for Instagram/Facebook/WhatsApp sellers.
It gives small independent sellers a public trust profile where buyers can:

- verify seller identity
- see ratings + reviews
- feel safe paying

Long-term goal:
Become the default "Trusted by MiddelMen" badge for social commerce.

Core future product:
Escrow + dispute resolution + reputation score.

---

1. TARGET USERS

---

### 1.1 Primary Users (Sellers)

- Small businesses selling through Instagram, WhatsApp, Facebook
- Home-based businesses (food, bakery, clothing, cosmetics, handmade items)
- Service sellers (makeup artists, freelancers)

Seller pain points:

- buyers don’t trust paying upfront
- fake payment screenshots
- reputation is scattered across DMs/comments
- hard to scale without proof of legitimacy

### 1.2 Secondary Users (Buyers)

- People buying products/services via DMs
  Buyer pain points:
- scam risk
- no refund guarantee
- no accountability
- no trusted reviews

### 1.3 Admin (Platform Operator)

- Moderation + dispute resolution
- verification approval
- review hiding and fraud control

---

2. CORE PRODUCT MODULES

---

Module A: Seller Public Profile

- username-based profile page
- seller bio + socials
- links list
- verified badge
- ratings + reviews
- shareable trust URL

Module B: Reviews + Reputation

- buyer review posting
- rating average + stats
- anti-spam controls
- review hiding/moderation

Module C: Seller Dashboard

- login + profile editing
- manage links
- review visibility controls
- verification workflow

Module D: Seller Verification

- Instagram handle linking
- WhatsApp OTP verification
- manual admin verification fallback
- verified badge display

Module E: Escrow Transactions (Phase 2)

- payment links
- funds held until completion
- transaction tracking
- auto-release rules
- dispute freeze logic

Module F: Disputes & Resolution (Phase 2)

- buyer complaint system
- evidence submission
- admin decision tools
- refund or release outcome

Module G: Admin Panel

- hide reviews
- ban users
- verify sellers
- view transaction history
- fraud risk dashboard

---

3. SUCCESS METRICS (KPIs)

---

### Phase 1 KPIs (Reputation MVP)

- number of onboarded sellers
- number of profile visits
- number of reviews submitted
- % sellers with verified badge
- conversion rate: profile view -> review submission
- search usage rate

### Phase 2 KPIs (Escrow launch)

- number of transactions processed
- GMV (gross merchandise value)
- transaction completion rate
- dispute rate (% of transactions disputed)
- dispute resolution time (avg)
- chargeback rate
- seller repeat usage

### Long-term KPIs

- seller retention (monthly)
- buyer repeat purchases
- revenue per transaction
- NPS / trust score recognition

---

4. PHASES OVERVIEW

---

Phase 0: Prototype (Current)
Phase 1: Market Deployable Reputation Platform
Phase 1.5: Growth + Verification + Admin Hardening
Phase 2: Escrow Payments + Transactions
Phase 2.5: Disputes + Refund Automation
Phase 3: Scaling + Monetization + Trust Scoring
Phase 4: Marketplace Infrastructure (optional expansion)

---

5. PHASE 0 – CURRENT MVP (DONE / PARTIAL)

---

Status: In progress

What exists:

- UI for profile, dashboard, auth, reviews
- localStorage mock data
- clean visual layout
- prototype review posting

Missing:

- real DB persistence
- real auth
- backend endpoints
- deployment setup

Exit Criteria (Phase 0 complete):

- codebase ready to connect to real backend
- mock API isolated so it can be replaced

---

6. PHASE 1 – MARKET DEPLOYABLE v1 (REPUTATION PLATFORM)

---

Goal:
Ship a fully working web app deployed online where sellers can onboard and
buyers can leave reviews.

### 6.1 Must-Have Features (MVP Launch)

- Real Postgres database (Neon recommended)
- Drizzle schema: users, profiles, links, reviews
- Auth: register/login/logout
- Session persistence
- Seller dashboard: edit profile + manage links
- Public profile: view seller info + reviews + links
- Search sellers
- Review submission with anti-spam rules
- Verified badge field (manual or placeholder)
- Admin ability to hide reviews (minimal moderation)

### 6.2 Must-Have Non-Functional Requirements

- input validation everywhere (Zod)
- secure cookies in production
- hashed IP storage (no raw IP)
- basic error handling + logging
- stable deployment on Vercel
- consistent UI theme and branding

### 6.3 Deliverables

- deployed URL
- working DB
- working login
- no localStorage dependency
- stable profile pages

### 6.4 Exit Criteria (Phase 1 done)

- 5–10 sellers can create profiles and share them publicly
- at least 20 reviews posted successfully
- no data loss on refresh
- review spam prevention works

---

7. PHASE 1.5 – TRUST HARDENING + GROWTH FOUNDATION

---

Goal:
Improve trust + prevent abuse before escrow payments.

### 7.1 Verification System

Implement at least one:

- WhatsApp OTP verification (recommended)
- Instagram bio verification code (manual check or semi-manual)
- Admin verification workflow

Add:

- verification request state:
  pending -> approved -> rejected

### 7.2 Better Moderation

- admin panel with:
  - review list + filters
  - user list
  - seller verification approvals
  - ban/suspend seller
- report seller button on public profile

### 7.3 Review Improvements

- allow review images (optional)
- allow seller response to review (optional)
- profanity filter (optional)
- review sorting options (newest/highest)

### 7.4 UI/Brand Improvements

- MiddelMen verification badge system:
  - Verified Seller (green)
  - New Seller (gray)
  - Trusted Seller (blue)
- Improve landing page:
  - clear product pitch
  - CTA for sellers to onboard
  - CTA for buyers to search sellers

### 7.5 Exit Criteria (Phase 1.5 done)

- verification process is live
- admin can handle moderation without code changes
- seller badge is visible and meaningful

---

8. PHASE 2 – ESCROW PAYMENTS + TRANSACTIONS

---

Goal:
Launch the true trust layer: payment holding + release after delivery.

### 8.1 Required Architecture

- Payment provider with marketplace payout support
- Do NOT store money directly in your own bank account

Recommended providers (depends on country):

- Stripe Connect
- Razorpay Route
- Paystack
- Flutterwave
- PayPal adaptive (if possible)

### 8.2 New Database Tables

- transactions
- disputes
- payout_logs

Transaction fields:

- id
- buyerName (or buyerUserId)
- buyerEmail/phone (optional)
- sellerId
- amount
- currency
- status
- paymentProvider
- paymentIntentId
- deliveryProof
- createdAt, updatedAt

Statuses:
created -> paid -> shipped -> delivered -> confirmed -> released

- disputed
- refunded
- canceled

### 8.3 Transaction Flow

1. Seller creates transaction link (amount, description)
2. Buyer pays
3. Money held by platform/payment provider
4. Seller marks shipped/delivered
5. Buyer confirms received
6. Auto-release after X days if buyer does nothing
7. If dispute raised -> funds frozen

### 8.4 Seller Dashboard Additions

- create payment request link
- view transaction history
- status tracker UI
- payout pending UI

### 8.5 Buyer UX Additions

- payment page with trust signals:
  - seller rating
  - verified badge
  - transaction terms
- receipt + tracking status page

### 8.6 Exit Criteria (Phase 2 done)

- 20+ transactions completed successfully
- no critical payment bugs
- auto-release works
- transaction history visible for sellers

---

9. PHASE 2.5 – DISPUTES + REFUNDS

---

Goal:
Handle real-world conflicts cleanly.

### 9.1 Dispute System

- buyer can raise dispute within time window
- buyer selects reason:
  - not delivered
  - damaged product
  - wrong item
  - scam/fake
- buyer uploads evidence:
  - screenshots
  - delivery proof
- seller can respond with evidence

### 9.2 Admin Resolution Panel

- dispute list
- view evidence
- decision actions:
  - release funds to seller
  - refund buyer
  - partial refund (optional)
- record decision notes

### 9.3 SLA (service level)

- dispute response time target: < 48h
- auto-close disputes after X days if no response

### 9.4 Exit Criteria (Phase 2.5 done)

- dispute flow is usable
- admin can resolve disputes easily
- platform has written dispute policy

---

10. PHASE 3 – MONETIZATION + TRUST SCORING

---

Goal:
Turn the platform into a sustainable business.

### 10.1 Monetization Options

- transaction fee (e.g. 3–7%)
- seller subscription tier:
  - Verified Pro
  - Featured profile
  - Instant payouts
- premium verification badge
- buyer protection fee add-on

### 10.2 Trust Score Algorithm

Build a trust score from:

- review count
- average rating
- dispute rate
- fulfillment speed
- verification status
- account age
- refund frequency

Expose as:

- Trust Score 0–100
- badge tiers:
  - New Seller
  - Verified Seller
  - Trusted Seller
  - Elite Seller

### 10.3 Growth Features

- referral system (seller invites seller)
- shareable trust badge widget for Instagram stories
- QR code trust page for physical packaging

### 10.4 Exit Criteria (Phase 3 done)

- revenue generated consistently
- sellers paying for premium tiers
- trust score impacts buyer conversion

---

11. PHASE 4 – EXPANSION / MARKETPLACE INFRASTRUCTURE (OPTIONAL)

---

Goal:
Evolve into a full commerce infrastructure.

Possible expansions:

- product listings
- inventory management
- built-in chat
- shipping integrations
- invoice generation
- buyer accounts + order history

This phase should only be started if:

- escrow transactions are successful
- disputes are manageable
- monetization is proven

---

12. DEPLOYMENT ROADMAP

---

### Phase 1 Deployment

- Vercel frontend
- Neon Postgres
- Backend via Next.js API routes OR Express deployed separately

### Phase 2 Deployment

- keep DB on Neon
- add payment provider integration
- add secure webhook endpoints

### Scaling Notes

- add caching for public profiles
- limit DB connections for Vercel serverless
- add rate limiting on sensitive routes

---

13. LAUNCH PLAN (EARLY STAGE)

---

### Launch Strategy

1. Recruit 5–10 trusted Instagram sellers
2. Help them create MiddelMen profiles
3. Give them a badge:
   "Verified on MiddelMen"
4. Ask them to share trust link in their bio
5. Collect 50+ reviews total
6. Use testimonials + proof for marketing

### Initial Growth Loop

Seller shares trust profile -> buyer trusts -> review created -> seller credibility increases -> seller sells more -> more reviews

---

14. RISK MANAGEMENT CHECKLIST

---

### Key Risks

- review spam / fake reviews
- seller impersonation
- legal liability if escrow handled incorrectly
- disputes becoming too manual
- payment chargebacks

### Mitigation

- anti-spam + verification
- manual admin approval for early stage
- clear ToS and dispute policy
- strict release timeline rules
- hold high-risk payouts longer

---

15. IMMEDIATE NEXT STEPS (EXECUTION ORDER)

---

Week 1:

- Finish Phase 1 backend + DB integration
- Replace mock API fully
- Deploy to Vercel with Neon DB

Week 2:

- Add Google auth
- Add admin panel (basic)
- Add verification flow (manual)

Week 3:

- Onboard first 10 sellers
- Collect real reviews
- Improve landing page and messaging

Week 4:

- Start escrow design + payment provider research
- Build transaction schema + status system (no payments yet)

---

## END OF ROADMAP
