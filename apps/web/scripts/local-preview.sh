#!/usr/bin/env bash
# Preview the site locally against a private copy of the live data.
#
# Copies the catalogue, team, settings, clients, passes and recent and upcoming
# appointments from the live database (read-only) into a Firestore emulator,
# then runs the site at http://localhost:3001 against that copy. Anything you
# book or change there is thrown away when you stop it with Ctrl+C.
#
# Email and SMS are switched off by blanking their keys (Next keeps variables
# that are already set, even empty ones, over .env.local), and push tokens are
# not copied, so nothing reaches clients or phones. Sign-in still uses the real
# Firebase Auth: log in as usual. The booking assistant still calls OpenAI.
#
# Usage, from apps/web:  pnpm preview:local        (PORT=3002 to change port)
set -euo pipefail
cd "$(dirname "$0")/.."

project="$(grep -E '^FIREBASE_ADMIN_PROJECT_ID=' .env.local | cut -d= -f2- | tr -d '"')"
snapshot="$(mktemp -t mediterranea-preview.XXXXXX)"
# The snapshot holds client details: never leave it behind.
trap 'rm -f "$snapshot"' EXIT

npx tsx scripts/preview-snapshot.ts export "$snapshot"

RESEND_API_KEY= NOTIFICATIONS_EMAIL_FROM= \
TWILIO_ACCOUNT_SID= TWILIO_AUTH_TOKEN= TWILIO_FROM_NUMBER= \
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= \
NEXT_DIST_DIR=.next-preview \
firebase emulators:exec --only firestore --project "$project" --config ../../firebase.json \
  "npx tsx scripts/preview-snapshot.ts import '$snapshot' && rm -f '$snapshot' && pnpm exec next dev -p ${PORT:-3001}"
