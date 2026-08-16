# Mediterránea Face Studio — Future Plan

> Remaining work carried over after Phases 0–5 and the AI assistant were completed.
> Refine and pick these up later. Companion: `implementation-plan.md` (the shipped roadmap).

**Status of the main roadmap:** Phases 0, 1, 2, 4, 5 are complete; the AI booking
assistant is complete (bar the customer-facing variant); Phase 3 (Commerce) has its
Stripe foundation + gift cards shipped, with the rest below.

---

## Phase 3 — Commerce (remaining)

The Stripe foundation is live (hosted Checkout + signature-verified
`/api/stripe/webhook` reconciling to Firestore; `formatPrice` in EUR). Gift cards
(buy online, backoffice issue/redeem/void) are done. Still to build:

- [ ] Retail products management (price, stock)
- [ ] Shop retail products — customer browse, cart, checkout (Stripe Checkout)
- [ ] Inventory / stock — movements, low-stock alerts
- [ ] Packages & memberships — define, link to services
- [ ] Client memberships — sell, track sessions used, renewals
- [ ] Customer: view / manage own membership (sessions remaining, renewal)
- [ ] Checkout / POS — services, products, packages, gift cards, discounts, tips
- [ ] Mobile checkout (mobile payment)

**Notes / reuse:**
- `lib/stripe/client.ts` (`getStripe`, `toCents`, `siteUrl`) + the webhook pattern
  in `app/api/stripe/webhook/route.ts` are ready to extend for new product types
  (branch on `session.metadata.type`).
- Gift cards already model balances + transactional redemption — memberships
  (session credits) can follow the same shape.

---

## AI assistant

- [ ] _(Later)_ Customer-facing booking assistant on the public/customer app —
  needs stricter guardrails, scoping, and rate limits distinct from the staff
  assistant. The staff assistant (web + mobile), confirmation-before-write, audit
  log, and rate limiting are all done and reusable.

---

## Go-live

- [ ] **Flip the public site live** — the full marketing + booking + blog + gift
  card + account experience is built and staged under `/init`. Promote `/init/*`
  to the root (replacing the coming-soon page) when ready.

---

## Hardening / follow-ups (nice-to-have)

- [ ] Server-side per-action enforcement of admin capabilities (today: capability
  model + nav gating; trusted-admin tier). Add capability checks inside the
  sensitive server actions/routes for defense in depth.
- [ ] Guest/public booking abuse: rate limiting is in place; consider a captcha or
  stronger throttle if abused. Phone numbers are E.164-normalized at SMS send.
- [ ] Idempotent seed/migration script per data-model change (ongoing discipline).
- [ ] Richer blog authoring (markdown/rich text, image upload to S3 instead of URL).

---

## Config / ops checklist (to enable already-built features in each environment)

- [ ] `OPENAI_API_KEY` (+ optional `OPENAI_AGENT_MODEL`) — booking assistant
- [ ] `RESEND_API_KEY` + `NOTIFICATIONS_EMAIL_FROM` — email (dormant otherwise)
- [ ] `TWILIO_ACCOUNT_SID` / `AUTH_TOKEN` / `FROM_NUMBER` — SMS (dormant otherwise)
- [ ] `CRON_SECRET` + a scheduler hitting `GET /api/cron/reminders` — day-before reminders
- [ ] `AWS_REGION` / `AWS_S3_BUCKET` (+ creds or IAM role) — before/after photos
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SITE_URL` — gift cards + future commerce
- [ ] Enable **Email/Password** sign-in in Firebase (customer accounts)
- [ ] Deploy `firebase deploy --only firestore:rules,firestore:indexes`
- [ ] Run `POST /api/admin/seed-studio` (starter staff/rooms), then confirm a booking end-to-end
- [ ] Optional: `POST /api/admin/sync-claims` to stamp existing admins' role claim
