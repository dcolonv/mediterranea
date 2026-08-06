# Mediterránea Face Studio — Implementation Plan

> **Last updated:** 2026-08-06
> **Companion roadmap (visual):** https://claude.ai/code/artifact/45e370ea-d1db-4b6c-ba7e-5d4a29b006fa

A living checklist for building out the full platform: a **public** marketing site, a
**customer** booking app, a **backoffice** admin web app, and a **backoffice mobile**
admin app. Check items off as you complete them.

**Legend:** `[x]` done · `[ ]` to do · items tagged _(partial)_ have a note on what's left.

---

## Locked decisions

These shape everything below. Change one and the plan shifts.

1. **Phase 1 scope — booking core, end-to-end.** Public site + customer accounts +
   online booking + backoffice scheduling + mobile in the room. Commerce, marketing,
   and loyalty are deferred.
2. **Scheduling — multi-staff + rooms from day one.** Per-staff hours, time off, and
   service qualifications; room assignment; availability solved across staff *and* rooms.
3. **Data & payments — Firestore + Stripe.** All app data in Firestore; Stripe is the
   source of truth for payments, subscriptions, and gift cards (when commerce lands).
4. **Messaging — Resend + Twilio.** Transactional/campaign email via Resend; SMS via
   Twilio, behind one provider-agnostic dispatch layer.

---

## Architecture

- One Next.js app, three guarded route groups — `(public)`, `(app)` customer,
  `(backoffice)` admin — plus the Expo mobile admin app. Shared types/UI via
  `@mediterranea/shared`.
- Three base roles: **customer**, **staff**, **admin**. Granular permissions later.
- **People model:** a `client` is a studio record (can be a walk-in with no login); a
  `user` is an auth account. Signing up links a user → client.
- Backbone: Firestore (data), Stripe (money), Resend + Twilio (messaging), Firebase
  Storage (photos), cron/Cloud Functions (reminders, aggregations).

---

## Baseline — already built ✅

The foundation this plan extends. All of these are implemented and building.

- [x] pnpm + Turborepo monorepo; Next.js 16 web; Expo SDK 54 mobile; `@mediterranea/shared`
- [x] Firebase Auth + Firestore; server-side Admin SDK; `admins/{email}` allowlist + `verifyAdminToken`
- [x] Services — admin CRUD (actions + API) and mobile management UI
- [x] Appointments — admin list/filter, status change, delete (web API + mobile)
- [x] Clients (customers) — CRUD (actions + API + mobile), search, detail w/ history, backfill migration
- [x] Mobile admin app — login (email/password + optional Google), tabs (Appointments, Customers, Services, Settings), light "Sandy Serenity" theme
- [x] Firestore rules + composite indexes for services, appointments, customers, staff, rooms
- [x] **Staff + Room data model** (working hours, qualifications, time off, room types) + seed route
- [x] **Availability engine** — deterministic slot computation across staff qualifications, hours, time off, bookings, and free rooms
- [x] **OpenAI booking agent** (Responses API, `gpt-5.6`) with tools for rooms/services/staff/staff-services/calendar and appointment create/query/update/delete, guarded by a transactional conflict check

> ⚙️ **Config still needed to fully use the agent:** set `OPENAI_API_KEY`; deploy
> `firestore:rules,firestore:indexes`; run `POST /api/admin/seed-studio` to create
> starter staff/rooms.

---

## Phase 0 — Foundations

Enablers with no screen of their own; Phase 1 can't start without them.

- [ ] RBAC roles (customer / staff / admin) via Firebase custom claims _(currently: admin via `admins/{email}` allowlist, customer via `__customer` session cookie; custom claims still to add)_
- [x] Middleware guards per route group; customer session handling _(admin `/backoffice` + customer `/init/account` guarded; customer sessions via verifiable Firebase session cookies)_
- [x] Extended data model (staff, rooms, clients+skin profile fields, appointment staff/room/source) — _(skinProfile + uid on clients now added; consultation intake fields are Phase 2)_
- [x] Availability engine as a standalone, tested module — _(partial: implemented; automated unit tests still to add)_
- [ ] Shared web UI kit extending the Sandy Serenity tokens
- [ ] Provider env wired but dormant: Stripe (test), Resend, Twilio
- [ ] CI typecheck + build gates

---

## Phase 1 — Booking core (the shippable release)

### 1a — Run the studio (backoffice web)

- [x] Staff management — profiles, roles, working hours, service qualifications, active _(backoffice `/backoffice/staff`; time-off editing still to add)_
- [x] Rooms / resources management _(backoffice `/backoffice/rooms`)_
- [x] Services management — room type + qualifying staff, full web UI _(backoffice `/backoffice/services`; who-for / aftercare fields still to add)_
- [x] Calendar — day / week / month, filter by aesthetician and by room _(backoffice `/backoffice/calendar`)_
- [x] Book new appointment (phone / walk-in) + create client on the fly _(walk-in modal on the availability engine, with existing-client search)_
- [x] Appointment detail lifecycle — cancel, check-in, complete, no-show, reschedule/reassign _(full state machine in the detail modal: pending→confirmed→checked-in→completed, plus cancel & no-show; reschedule uses the live availability engine with the transactional conflict guard)_
- [x] Treatment notes on appointments _(editable notes in the appointment detail view)_
- [x] Client list with search _(backoffice `/backoffice/clients`, debounced search; also on mobile)_
- [x] Client detail — contact, treatment history, notes, tags, visit rollups _(web + mobile; skin profile still to add)_
- [x] Dashboard — today's schedule + metrics (today / checked-in / completed / awaiting confirmation / this week), with quick book + assistant _(backoffice `/backoffice`)_
- [x] Base settings — business hours, booking rules (lead time / advance window / slot interval), cancellation policy _(backoffice `/backoffice/settings`, stored in `settings/studio`; booking rules + business hours wired into the availability engine)_

### 1b — Customers book online (public + customer web)

> **Staging note:** the public booking site is built under `/init/*` (guest booking,
> no accounts). The live root still shows "Coming Soon"; flip `/init/*` → root to go live.

- [ ] Public home / landing with featured treatments (replace coming-soon) _(marketing home built + staged at `/init`; go-live flip still pending)_
- [x] Treatments catalog by category _(`/init/treatments`, live services grouped facial / treatment)_
- [x] Treatment detail — description, duration, price _(`/init/treatments/[slug]`; who-for / aftercare fields still to add to the model)_
- [x] Contact / location / hours page _(`/init/contact`, hours from studio settings)_
- [x] Customer sign up, log in, password reset _(`/init/signup`, `/init/login`, `/init/reset`; email/password + Google; Firebase session cookie `__customer`, separate from admin)_
- [x] Customer profile — personal + contact details _(`/init/account/profile`)_
- [x] Skin profile — skin type, concerns, preferences _(`/init/account/profile`; stored on the customer record)_
- [x] Booking flow — treatment → aesthetician or "any" → date/time from live availability → confirm _(`/init/book`, guest or logged-in with prefill; server resolves staff + room, transactional guard)_
- [x] Booking confirmation + add-to-calendar (.ics) _(confirmation step with .ics download)_
- [x] Cancellation policy display at booking _(policy text from settings shown at the details step + on confirmation)_
- [x] View upcoming and past appointments _(`/init/account`, linked by uid + email)_
- [x] Self-service reschedule / cancel own appointments (within policy) _(`/init/account`; enforced against the cancellation cutoff + live availability, transactional guard)_

### 1c — Communications + in-room mobile

- [x] Notification dispatch layer (event → template → channel) over Resend + Twilio _(`lib/notifications/*`; REST-based, dormant + logs when keys absent)_
- [x] Booking confirmation (email + SMS) _(fired from the create choke point — online, walk-in, and agent bookings)_
- [x] Appointment reminders (scheduled) _(`GET /api/cron/reminders`, day-before, CRON_SECRET-gated; needs a scheduler wired — Vercel Cron / Cloud Scheduler)_
- [x] Cancellation notices _(fired from admin, customer, and agent cancellation paths)_
- [ ] Staff push notifications — new bookings, cancellations _(needs FCM device tokens; with mobile)_
- [x] Mobile: today's schedule as the default screen _(Appointments tab is now a day view defaulting to today)_
- [x] Mobile: calendar quick view (day / week) _(week strip + day list, prev/next week, tap a day)_
- [x] Mobile: quick walk-in booking _(`appointments/new`: service → practitioner → date → live times → client; server resolves staff/room)_
- [x] Mobile: appointment check-in / check-out / complete / no-show + notes _(status grid covers all states; editable treatment notes)_
- [x] Mobile: client lookup — notes & history in the room _(Customers tab: search, detail with history + notes)_
- [x] Mobile: login with secure token storage _(email/password + admin gate; AsyncStorage persistence)_

---

## AI booking assistant (cross-cutting workstream)

An LLM agent that books, reschedules, and cancels appointments conversationally.
The **model decides**; the **tools enforce correctness** (a transactional conflict
check makes double-booking impossible). Threads through Phase 1 — the chat UI belongs
with **1a** (backoffice) and **1c** (mobile); notifications hook into **1c**.

### Built ✅

- [x] Deterministic availability engine (staff qualifications, hours, time off, bookings, free room)
- [x] Agent tools — rooms, services, staff, staff-services, calendar query, appointment create/query/update/delete
- [x] OpenAI booking agent — Responses API (`gpt-5.6`), function-calling loop, admin-gated `POST /api/agent`
- [x] Transactional conflict guard on create/update (LLM cannot double-book)
- [x] Seed route for starter staff/rooms (`POST /api/admin/seed-studio`)

### Go-live config

- [ ] Set `OPENAI_API_KEY` (and optional `OPENAI_AGENT_MODEL`) in `apps/web/.env.local`
- [ ] Deploy `firestore:rules,firestore:indexes`
- [ ] Run `POST /api/admin/seed-studio`, then confirm a real booking end-to-end

### Use it — UI & entry points

- [x] Backoffice **chat UI** (web) — slide-over assistant panel (server action → booking agent), shows the tools it ran and refreshes the calendar on a booking _(launched from `/backoffice/calendar`)_
- [ ] Mobile **"book by chat"** in the admin app _(with 1c)_
- [x] Quick entry points — launch the assistant from the calendar _(✦ Assistant button; today's-schedule entry still to add)_
- [ ] Conversation history persistence (per staff session)

### Guardrails & trust

- [ ] Confirmation-before-write — agent proposes create/update/delete, human confirms
- [ ] Audit log of agent actions (who, when, tool, args, result)
- [ ] Rate limiting / usage caps on `/api/agent`
- [ ] Unit tests for the availability + conflict engine (correctness floor, independent of the LLM)

### Integrations

- [x] Agent bookings trigger Phase 1c notifications (confirmations / reminders) _(the notification hook lives at the shared create choke point, so agent bookings notify too)_
- [ ] _(Later)_ Customer-facing booking assistant on the public/customer app — needs stricter guardrails and scoping

---

## Phase 2 — Records, consent & feedback

**Records/consent/GDPR core delivered; photos, recipes, reviews & waitlist still to build.**

- [x] Intake / consultation form (skin type, allergies, medications, conditions, concerns) _(customer account `/init/account/profile`)_
- [x] Digital consent capture _(typed-name signature + versioned consent + timestamp)_
- [x] GDPR consent management _(marketing opt-in + versioned treatment consent stored per customer)_
- [x] Backoffice: view intake forms _(client detail shows skin profile, intake, consent; "manage" = edit still customer-side)_
- [x] Backoffice: GDPR export + hard-delete a client's data _(export to JSON + erase customer & all their appointments; photos N/A until added)_
- [ ] Before/after photos — capture (mobile camera) + storage (Firebase Storage)
- [x] Backoffice client detail: total spend _(photos still pending)_
- [ ] Treatment recipes — editor (steps, timings, products, device settings, contraindications, aftercare)
- [ ] Mobile: per-treatment recipe cheat sheet
- [ ] Reviews — submit after appointment
- [ ] Reviews — display
- [ ] Waitlist — add clients, auto-match on cancellation, offer slots

---

## Phase 3 — Commerce (deferred, Stripe)

- [ ] Stripe integration — payments with SCA / 3-D Secure; webhooks reconcile to Firestore
- [ ] Retail products management (price, stock)
- [ ] Shop retail products (browse, cart, checkout) — customer
- [ ] Inventory / stock — movements, low-stock alerts
- [ ] Packages & memberships — define, link services
- [ ] Client memberships — sell, track sessions used, renewals
- [ ] Customer: view / manage own membership (sessions remaining, renewal)
- [ ] Gift cards — issue, redeem, balances (backoffice) + buy/redeem (customer)
- [ ] Checkout / POS — services, products, packages, gift cards, discounts, tips
- [ ] Mobile checkout (mobile payment)

---

## Phase 4 — Marketing & growth (deferred)

- [ ] Campaigns — segmentation, email/SMS campaigns, win-back
- [ ] Loyalty — rules configuration
- [ ] Loyalty — customer balance and redemption
- [ ] Reviews moderation — approve / hide / publish
- [ ] Blog CMS — create / edit / publish, SEO
- [ ] Public blog / skincare tips

---

## Phase 5 — Intelligence & control (deferred)

- [ ] Reports & analytics — revenue, popular treatments, staff performance, retention, no-show rate
- [ ] Advanced settings — notification templates, integrations
- [ ] Granular roles & permissions (beyond base roles)
- [ ] Richer dashboard

---

## Cross-cutting foundations (built once, used across phases)

- [ ] Notifications dispatch layer (Resend + Twilio + push) with scheduled reminders — _stood up in 1c_
- [ ] Media: Firebase Storage for before/after photos, role-scoped rules, signed URLs — _Phase 2_
- [ ] Payments: Stripe as system of record; webhook reconciliation — _Phase 3_
- [ ] Privacy: per-collection Firestore rules by role _(in place)_; GDPR export/delete tooling — _Phase 2_
- [ ] Quality: CI typecheck + build gates; an idempotent seed/migration script per data-model change

---

## How to use this doc

- Work top-down within a phase; **Phase 1** ships first (1a → 1b → 1c, buildable in parallel once Phase 0 lands).
- When you complete an item, change `[ ]` to `[x]` and drop the _(partial)_ note if fully done.
- Keep **Baseline** in sync when a capability graduates from partial to complete.
- Phase order after Phase 1 can flex with business priorities.
