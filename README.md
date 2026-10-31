# Ogxchange

Ogxchange is a Next.js App Router application for a Nigeria-focused crypto/NGN exchange. The landing page displays read-only CoinGecko market rates in naira for the supported BTC, ETH, and USDT assets, with a conversion estimate and the initial Supabase database/auth foundation.

## Current stage and safety

- Market rates are fetched from CoinGecko for the three assets in the current supported-asset list. Conversion is an indicative estimate only; it does not request or create a quote.
- Trading, crypto deposits, customer balances, payouts, and payment confirmations are **not implemented or enabled**. No successful transaction is simulated.
- The database seeds disabled asset/network metadata only. Rates are unset and all trading flags default to `false`.
- Supabase browser and server clients use the public anon key and rely on database row-level security. The service-role key is for future server-only operations and must never be exposed to a browser.
- Do not enable live trading until server-authoritative quote/order processing, payment-provider verification, custody/payout controls, monitoring, and operational procedures are implemented and tested.

## Local setup

Requirements: Node.js 20 or newer and npm.

1. Install packages:

   ```bash
   npm install
   ```

2. Create a Supabase project. In **Project Settings → API**, copy the project URL and publishable/anon key. Copy `.env.example` to `.env.local` and fill in those two values. Keep `EXCHANGE_MODE=demo`.

   ```bash
   cp .env.example .env.local
   ```

   The Supabase service-role key is not needed by this stage. If you configure it for a later server-only integration, keep it out of all `NEXT_PUBLIC_*` variables, client components, logs, and source control.

3. Apply the migration in `supabase/migrations/20261028170000_initial_schema.sql` using the Supabase SQL Editor or Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   The migration creates the initial profile/auth trigger, catalog/settings, orders, append-only ledger, payment-event deduplication, notifications, audit log, access policies, and disabled asset/network metadata. It intentionally does not insert live rates or enable trading.

4. In Supabase **Authentication → URL Configuration**, set the local site URL to `http://localhost:3000` and add your local and production callback URLs as allowed redirect URLs before enabling signup flows.

5. Start the application:

   ```bash
   npm run dev
   ```

   Then visit `http://localhost:3000`.

## Database access model

- Customer profiles are created from Supabase Auth users with the `customer` role. Auth user metadata cannot grant staff access.
- Users can read their own profile, orders, ledger entries, and notifications. Profile updates are limited to name and phone; order, payment-event, and ledger writes have no authenticated-client write policy.
- `has_staff_role()` and `has_admin_role()` read the role from the protected profile table. Staff roles cannot be changed through the customer client. Provision or revoke the initial admin using a trusted Supabase SQL Editor session after verifying the target auth user ID; never accept an admin role from signup metadata or a browser request.
- Ledger entries are append-only and payment provider event IDs are unique per provider. These database constraints are a foundation, not a substitute for provider signature validation, idempotent server workflows, reconciliation, and payout controls.

## Checks

```bash
npm run lint
npm run build
```

## Deploying to Vercel

Import the repository into Vercel and set the variables from `.env.example` in the project’s environment settings. Set the Supabase URL and anon key for Preview and Production, configure matching Supabase Auth redirect URLs, and keep `EXCHANGE_MODE=demo`. Do not add a service-role key until a server-only feature requires it, and then restrict its use to trusted server code. Deploy only after the Supabase migration has been applied.

## Nigerian regulatory review before launch

Crypto-asset exchange, virtual-asset service, custody, payment collection, and NGN payout activities can trigger Nigerian regulatory, AML/CFT, consumer-protection, data-protection, and financial-services obligations. Obtain advice from qualified Nigerian legal/compliance professionals and confirm the applicable SEC, CBN, NFIU, tax, and privacy requirements and licensing/registration status for the actual operating model before accepting customers or funds. This project is not legal advice and does not establish regulatory approval.
# OGXchange
