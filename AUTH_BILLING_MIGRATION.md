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

## Data model notes
- No separate database is required for this scaffold.
- Credits are stored on the Clerk user object (`privateMetadata`).
- `STARTER_CREDITS` is used when user has no stored credits yet.

## Backward compatibility
- Existing underwriting UI (`src/UnderwritingApp.jsx`) remains intact and is now shown behind auth.
- Existing API routes (`/api/claude`, `/api/waitlist`) unchanged.

## Vercel setup
1. Add all env vars from `.env.example` in Vercel Project Settings.
2. Create Stripe Product + Price for one credit pack and set `STRIPE_CREDIT_PRICE_ID`.
3. Create Stripe webhook endpoint:
   - URL: `https://<your-domain>/api/billing/webhook`
   - Events: `checkout.session.completed`
   - Copy signing secret into `STRIPE_WEBHOOK_SECRET`
4. Redeploy.

## Caveats for next iteration
- Webhook currently uses Clerk metadata and a session-id guard for idempotency; move to a DB ledger for auditability.
- Consider adding per-analysis credit decrement endpoint and usage tracking.
- Add stricter webhook raw-body handling if your runtime changes.
