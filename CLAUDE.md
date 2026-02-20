# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
pnpm dev      # Start development server (port 3000)
pnpm build    # Production build
pnpm start    # Run production server
pnpm lint     # Run ESLint
```

## Architecture

This is a Next.js 16 project using the App Router pattern with React 19.

**Stack:**
- Next.js 16 with App Router (not Pages Router)
- TypeScript with strict mode
- Tailwind CSS 4 with PostCSS
- pnpm package manager

**Path Alias:**
- `@/*` maps to the project root (e.g., `@/app/page.tsx`)

**App Router Structure:**
- `app/` contains all routes and layouts
- Server Components are the default
- Use `"use client"` directive for client components
