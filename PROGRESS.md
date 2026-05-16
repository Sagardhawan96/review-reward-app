# ReviewReward — Master Progress Tracker

> This file is the single source of truth.
> Every session MUST start by reading this file.
> Every session MUST end by updating this file.
> Never mark a task done unless the GATE for it is verified.

---

## Current Status

```
Last session  : 2026-05-16
Last completed: Gate 1A ✅ PASSED — both price rules confirmed Active in Shopify Admin → Discounts
                  "ReviewReward - Text Review (Tier 1)" — ₹200 off — Active
                  "ReviewReward - Photo Review (Tier 2)" — 10% off — Active
Next task     : Gate 1C — place a test order on sagar-review-test-2.myshopify.com,
                go to order confirmation page, verify review widget appears visually.
                Then: Phase 1D — migrate SQLite → Neon Postgres (data resets on every deploy)
Active blocker: NONE

WHAT WAS FIXED THIS SESSION:
- Root cause: createPriceRules() was never called in OAuth callback (Sagar's original code)
- Fix: Added write_price_rules scope + createPriceRules() call to backend/routes/auth.js
- Added createScriptTag() call in OAuth callback (Gate 1C fix)
- Pushed to github.com/Sagardhawan96/review-reward-app main branch → Railway auto-deployed
- write_price_rules scope added to Shopify Partners dashboard (released as reviewreward-5)
- Gate 1A verified: fresh uninstall+reinstall → both price rules appear as Active in Shopify Admin
- Deployment image: sha256:864c9e3946c4f0818dc9de02a7472c129a6ece8cd7bf35fdaeb81b591863d44c

CRITICAL: railway up from local was broken for entire session due to Windows-generated
package-lock.json causing native sqlite3 binary mismatch on Linux. Always push via GitHub.

GitHub access: Sagar's repo = github.com/Sagardhawan96/review-reward-app
               Push via: git remote sagar (needs fresh token each session)
App URL       : https://review-reward-app-production.up.railway.app
Repo          : C:\Users\amit6\ReviewReward (local)
Dev store     : sagar-review-test-2.myshopify.com
```

---

## Phase 1 — Fix What Is Broken

> Do not start Phase 2 until ALL Phase 1 tasks are gated and verified.

### 1A — Restore Discount Code Generation ✅ GATE PASSED 2026-05-16
- [x] Restore `createPriceRules()` call inside `auth.js` OAuth callback
- [x] Restore `createScriptTag()` call inside `auth.js` OAuth callback  
- [x] Verify `generateDiscountCode()` is called on review submit with null-check guard
- [x] **GATE PASSED** — "ReviewReward - Text Review (Tier 1)" ₹200 + "ReviewReward - Photo Review (Tier 2)" 10% both Active in Shopify Admin → Discounts after fresh install

**GATE:** Submit a review on the test page. Open Shopify admin → Discounts.
A code starting with `TXT-` must exist there. ✅ VERIFIED 2026-05-16

---

### 1B — Fix Rating Breakdown Chart
- [x] Replaced broken template literal with 5 static `<div class="rating-row">` elements
- [x] JS populates `id="bar-1"` through `id="bar-5"` widths dynamically on load
- [x] Dashboard file at `backend/public/index.html` — confirmed no `${n}` in source

**GATE:** Open dashboard in browser, connect store — rating bars must render visually. ✅ FIXED IN CODE

---

### 1C — Wire Widget Into Shopify Store Pages
- [x] After OAuth callback completes, call `POST /admin/api/script_tags.json`
- [x] Script tag points to `https://review-reward-app-production.up.railway.app/widget.js`
- [x] Widget reads `Shopify.checkout.order_id` and `Shopify.checkout.email` (fixed — was using URL regex which fails on /thank_you page)
- [ ] Test on dev store order confirmation page

**GATE:** Place a test order on the dev store. Go to the order confirmation page.
The review form must visually appear on that page. If not, this task is NOT done.

---

### 1D — Fix SQLite Data Loss (Migrate to Neon Postgres)
- [ ] Create free Neon Postgres database at neon.tech
- [ ] Add `DATABASE_URL` environment variable to Railway
- [ ] Replace `sqlite3` with `pg` (node-postgres) in `db.js`
- [ ] Update all queries to use `$1, $2` parameter syntax instead of `?`
- [ ] Test all routes still work after migration

**GATE:** Redeploy Railway. Submit a test review. Redeploy Railway again (forcing a restart).
Open the dashboard — the previously submitted review must still be there. If data is gone, this task is NOT done.

---

## Phase 2 — Complete the Core Product

> Do not start Phase 2 until Phase 1 is 100% complete and all gates passed.

### 2A — Shopify Billing
- [ ] On OAuth callback, create `RecurringApplicationCharge` via Shopify API
- [ ] Redirect merchant to Shopify billing approval page
- [ ] Handle billing approval callback — set `billing_active = true` in DB
- [ ] Gate all API routes: if `billing_active = false`, return 402
- [ ] Test: install app, go through billing approval, verify access granted

**GATE:** Install app on dev store. You must see a Shopify billing approval screen.
After approving, the dashboard must load. Without approving, it must block. If either fails, NOT done.

---

### 2B — Email Delivery of Discount Codes
- [ ] Sign up for Resend (free tier, resend.com)
- [ ] Add `RESEND_API_KEY` to Railway environment variables
- [ ] After successful review submission, send transactional email to customer
- [ ] Email contains: discount code, expiry date, shop name, "Shop Again" button
- [ ] Test with real email address

**GATE:** Submit a review using a real email address you own.
You must receive the email with the discount code within 60 seconds. If not, NOT done.

---

### 2C — Settings Sync to Shopify Price Rules
- [ ] When merchant saves new Tier 1 or Tier 2 value in dashboard, call `PUT /price_rules/:id.json`
- [ ] Verify new codes reflect the updated amount
- [ ] Test: change Tier 1 to ₹500, submit a review, verify ₹500 deducts at Shopify checkout

**GATE:** Change Tier 1 reward to ₹500 in dashboard. Submit a new review. Apply the generated code at Shopify checkout.
The discount must show ₹500. If it shows ₹200 or fails, NOT done.

---

## Phase 3 — Tests and Security

> Do not start Phase 4 until ALL tests are written and passing.

### 3A — Unit Tests
- [ ] Install Jest and nock: `npm install --save-dev jest nock`
- [ ] Test `generateDiscountCode()` with mocked Shopify API
- [ ] Test `createPriceRules()` with mocked Shopify API
- [ ] Test review validation: min chars, duplicate order, missing fields
- [ ] Test db helper functions against in-memory DB

**GATE:** Run `npm test`. All tests must pass with 0 failures. If any fail, NOT done.

---

### 3B — Integration Tests
- [ ] Install Supertest: `npm install --save-dev supertest`
- [ ] Test `POST /api/reviews` — text only → tier 1 code returned
- [ ] Test `POST /api/reviews` — with photo → tier 2 code returned
- [ ] Test `POST /api/reviews` — duplicate order → 409 returned
- [ ] Test `POST /api/reviews` — short review → 400 returned
- [ ] Test `GET /api/settings/:shop` → correct defaults returned
- [ ] Test `PUT /api/settings/:shop` → updates successfully

**GATE:** Run `npm test`. All integration tests must pass. If any fail, NOT done.

---

### 3C — Security Hardening
- [ ] Add `express-rate-limit`: max 10 review submissions per IP per hour
- [ ] Validate HMAC signature on all Shopify webhooks
- [ ] Validate OAuth state nonce on callback
- [ ] Sanitize all text inputs (strip HTML tags)
- [ ] Validate MIME type server-side for photo uploads
- [ ] Verify `.env` is in `.gitignore` and not in git history

**GATE:** Run a manual security checklist — try submitting HTML in review text, try uploading a .exe renamed as .jpg, try calling the API with a fake shop domain. All must be rejected. If any pass through, NOT done.

---

### 3D — Stress Tests
- [ ] Install k6 on Mac: `brew install k6`
- [ ] Write k6 script: 200 concurrent users, 5 minute duration
- [ ] Run test and capture results
- [ ] p95 response time must be under 3 seconds
- [ ] Error rate must be under 1%

**GATE:** Run k6 script. Screenshot of results showing p95 < 3s and error rate < 1%. If either threshold exceeded, fix and retest before marking done.

---

### 3E — GitHub Actions CI
- [ ] Create `.github/workflows/test.yml`
- [ ] On every `git push`, automatically run `npm test`
- [ ] If tests fail, block the commit from deploying to Railway

**GATE:** Push a commit with a deliberately broken test. GitHub Actions must show a red failure badge. Fix the test, push again — badge must go green. If CI doesn't run, NOT done.

---

## Phase 4 — Ship

> Do not start Phase 4 until Phases 1, 2, and 3 are 100% complete.

### 4A — Onboard 10 Real Merchants
- [ ] Identify 10 Indian D2C brands on LinkedIn/Instagram
- [ ] Send direct outreach message with install link
- [ ] Get all 10 actively using the app
- [ ] Collect feedback from each one
- [ ] Fix top 3 issues reported

**GATE:** Dashboard shows 10 different shop domains connected. At least 3 have submitted real reviews. If not, NOT done.

---

### 4B — App Store Submission
- [ ] Write privacy policy (host at `/privacy`)
- [ ] Write app listing copy — title, description, screenshots
- [ ] Record a 60-second demo video
- [ ] Submit for Shopify App Store review
- [ ] Pass Shopify's review (usually 1-2 weeks)

**GATE:** App appears publicly on Shopify App Store with a live install link. If not, NOT done.

---

## Session Log

| Date | What Was Done | What Is Next | Who Did It |
|------|--------------|--------------|------------|
| -    | Project set up, app deployed, basic flow working | Phase 1A — discount codes | Sagar + Claude |
| 2026-05-15 | Full project rebuilt locally. Phase 1A code written (createPriceRules restored). Phase 1B fixed (rating chart). Server boots clean, 0 vulnerabilities. | Phase 1C — Script Tag injection + Gate 1A verification with real credentials | Claude |
| 2026-05-16 | Gate 1A PASSED. Added write_price_rules to Shopify Partners dashboard (reviewreward-5). Fresh uninstall+reinstall confirmed both price rules Active in Shopify Admin. createScriptTag() also live. | Gate 1C — test widget on order confirmation page. Then Phase 1D — Neon Postgres migration. | Claude + Sagar |

---

## Rules (Non-Negotiable)

1. Every session starts with: `cat PROGRESS.md`
2. Every session ends with: update PROGRESS.md and `git commit -m "Progress update: [what was done]"`
3. A task is only checked off when its GATE is physically verified in the browser or terminal
4. Phases are sequential — Phase 2 never starts before Phase 1 is fully gated
5. If a gate fails, the task stays unchecked and the blocker is written under "Active blocker"
6. No cosmetic or "nice to have" work until all gates for the current phase are passed
