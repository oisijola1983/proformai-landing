# Auth + Billing Migration Notes (Clerk + Stripe)

## What changed
- Added Clerk auth to protect `/app` and `/app/billing`.
- Added billing UI with current credit balance and Stripe Checkout button.
- Added API routes:
  - `POST /api/billing/checkout` create Stripe Checkout session
  - `POST /api/billing/webhook` apply credits after successful payment
  - `GET /api/credits` fetch current credits for signed-in user
- Added minimal credit ledger in Clerk `privateMetadata`:
  - `credits`
  - `lastStripeSessionId` (idempotency guard)
  - `lastPaymentAt`
- Improved webhook signature reliability by consuming raw request body when available.
- Billing page now surfaces `checkout=success|cancelled` statuses and auto-refreshes displayed credits.

## Data model notes
- No separate database is required for this scaffold.
- Credits are stored on the Clerk user object (`privateMetadata`).
- `STARTER_CREDITS` is used when user has no stored credits yet.

## Backward compatibility
- Existing underwriting UI (`src/UnderwritingApp.jsx`) remains intact and is now shown behind auth.
- Existing API routes (`/api/claude`, `/api/waitlist`) unchanged.

## Required environment variables
- `ANTHROPIC_API_KEY`
- `LOOPS_API_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_CREDIT_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL` (example: `https://your-domain.vercel.app`)
- `STARTER_CREDITS` (example: `25`)
- `CREDIT_PACK_SIZE` (example: `100`)

## Vercel setup / deploy checklist
1. Add all required env vars in Vercel Project Settings (Production + Preview as needed).
2. In Stripe, create Product + Price for one credit pack and set `STRIPE_CREDIT_PRICE_ID`.
3. Create Stripe webhook endpoint:
   - URL: `https://<your-domain>/api/billing/webhook`
   - Event: `checkout.session.completed`
   - Copy signing secret into `STRIPE_WEBHOOK_SECRET`
4. Deploy:
   - `npm run build` (local verification)
   - `vercel --prod` (or push to connected Git branch)
5. Smoke test:
   - Sign up/in at `/app/sign-up`
   - Open `/app/billing`, verify current credit balance loads
   - Run test checkout (Stripe test mode), confirm success redirect and credit increase

## Caveats for next iteration
- Webhook currently uses Clerk metadata + session-id guard; move to a DB-backed ledger for full auditability.
- Add per-analysis credit decrement endpoint and usage tracking when ready to enforce consumption.
