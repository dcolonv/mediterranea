# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Monorepo commands (from root)
pnpm dev          # Start all dev servers
pnpm dev:web      # Start web dev server (port 3000)
pnpm dev:mobile   # Start Expo dev server
pnpm build        # Production build (all packages)
pnpm build:web    # Production build (web only)
pnpm lint         # Run ESLint (all packages)
pnpm lint:web     # Run ESLint (web only)

# From apps/web/
pnpm dev          # Next.js dev server
pnpm build        # Next.js production build
pnpm start        # Run production server
pnpm lint         # Run ESLint

# From apps/mobile/
pnpm dev          # Expo dev server
```

## Architecture

This is a **pnpm workspaces + Turborepo monorepo** with a Next.js 16 web app, an Expo mobile app, and a shared package.

**Monorepo Structure:**
```
mediterranea/
├── package.json              # Workspace root (turbo scripts)
├── pnpm-workspace.yaml       # apps/*, packages/*
├── turbo.json                # Build pipeline config
├── tsconfig.base.json        # Shared TS compiler options
├── firestore.rules           # Firebase CLI config
├── packages/
│   └── shared/               # @mediterranea/shared (raw .ts, no build step)
│       └── src/
│           ├── types/         # Service, Appointment, AuthUser types
│           ├── constants/     # Business hours, services, contact info
│           ├── validations/   # Zod schemas
│           ├── utils.ts       # formatPrice, formatDuration
│           └── firebase/      # Platform-agnostic initFirebase()
├── apps/
│   ├── web/                  # @mediterranea/web (Next.js 16)
│   │   ├── app/              # App Router routes
│   │   ├── components/       # React components
│   │   ├── actions/          # Server actions
│   │   ├── lib/              # Web-specific utils (cn(), firebase auth/admin)
│   │   └── middleware.ts     # Auth middleware
│   └── mobile/               # @mediterranea/mobile (Expo)
│       ├── app/              # Expo Router screens
│       └── src/              # API client, firebase, providers
```

**Stack:**
- Next.js 16 with App Router (not Pages Router)
- React 19 + TypeScript strict mode
- Tailwind CSS 4 with PostCSS
- Expo (React Native) for mobile
- Firebase/Firestore backend
- pnpm workspaces + Turborepo

**Import Conventions:**
- Shared types/constants/utils: `@mediterranea/shared/types`, `@mediterranea/shared/constants`, etc.
- Web-specific `cn()`: `@/lib/utils`
- Firebase auth/admin (web-only): `@/lib/firebase/auth`, `@/lib/firebase/admin`
- Firebase config (web wrapper): `@/lib/firebase/config`
- `@/*` maps to each app's root (e.g., `@/components/ui` in web, `@/src/api/client` in mobile)

**Shared Package (`@mediterranea/shared`):**
- Internal package with raw TypeScript (no build step)
- Both Next.js and Metro transpile directly
- Exports via `package.json` `exports` field

**API Routes (for mobile):**
- `GET /api/services` — public, returns active services
- `GET /api/appointments?slots=true&date=&duration=` — public, returns available slots
- `POST /api/appointments` — public, creates appointment
- `GET /api/appointments` — admin (Bearer token), lists appointments
- `PATCH /api/appointments/[id]` — admin, updates status
- `DELETE /api/appointments/[id]` — admin, deletes appointment

**App Router Structure (web):**
- `app/` contains all routes and layouts
- Server Components are the default
- Use `"use client"` directive for client components
