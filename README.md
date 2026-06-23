# Sri Siri Home Foods

Two real apps for a home-foods business, sharing one React codebase and a Supabase backend:

- **Customer app** (`apps/customer`) — public storefront: browse → cart (free-delivery meter + coupons) → email/Google sign-in → checkout → live order tracking. Ships as a **PWA** and an **Android** app.
- **Owner cockpit** (`apps/owner`) — private admin for the **super admin**: dashboard KPIs, **live order inbox** (Supabase Realtime), products with photo upload, **Counter Sale (POS)** with WhatsApp bill, expenses, P&L, workers, customers, delivery rules. Email/password login, gated on the admin role. Ships as a **PWA** and a **private Android** app.

This is the **HQ's own business** build. The franchise / multi-outlet model is a deferred future phase — only a `store_id`/`outlets` schema anchor is laid for it.

## Stack

- Monorepo via **npm workspaces** (`packages/*`, `apps/*`)
- **Vite + React 18**, plain CSS (warm spice palette · Space Grotesk + Source Serif 4)
- **Supabase** — Postgres + Auth (email/password + Google) + Storage (product photos) + Realtime + RLS
- **@tanstack/react-query** data layer · **vite-plugin-pwa** · **Capacitor** (Android)

## Structure

| Path | Purpose |
| --- | --- |
| `packages/shared` | Shared core: Supabase client, `useStore` hook (replaces the old in-memory store), `useAuth`, localStorage cart, Storage upload, `Icon`, `styles.css`, DB↔UI mappers, seed data |
| `apps/customer` | Customer storefront (PWA + Android) |
| `apps/owner` | Owner cockpit + POS (PWA + Android) |
| `supabase/migrations/0001_init.sql` | Schema, RLS, RPCs (`place_order`, `counter_sale`), Storage bucket, seed |

## Setup

### 1. Backend (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migration — either with the CLI (`supabase db push`) or by pasting `supabase/migrations/0001_init.sql` into the **SQL Editor** and running it.
3. **Auth → Providers**: **disable Phone**; **enable Email**; **enable Google** (add the client ID/secret and your redirect URLs, e.g. `http://localhost:5173` and your deployed origins). For quick local testing you can turn off "Confirm email".
4. Sign up once on the customer app (or create the user in the dashboard), then promote it to **super admin** by email:
   ```sql
   update profiles set role = 'super_admin' where email = 'you@example.com';
   ```
   That account can now sign in to the Owner cockpit and see all data/views.

### 2. Env

Copy `.env.example` → `.env` in **each** app and fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

### 3. Install & run (web)

```bash
npm install
npm run dev:customer   # http://localhost:5173
npm run dev:owner      # http://localhost:5173 (run separately)
```

### 4. Android (Capacitor)

The native projects live in `apps/<app>/android`. To build/run:

```bash
cd apps/customer        # or apps/owner
npm run build           # produce dist/
npx cap sync android    # copy web assets into the native project
npx cap run android     # build & launch on device/emulator (needs Android Studio + SDK)
```

## Distribution

- **Customer app** → public **Play Store** listing, and installable as a **PWA** from the website.
- **Owner app** → **private**: Play Store internal/closed track, sideloaded APK, or a PWA link. Not publicly listed.

## Deferred (future phases)

Franchise / multi-outlet model (HQ→franchise wholesale supply, order routing, franchise cockpit, consolidated reports), real payment gateway, push notifications, iOS. The COD/UPI selector and `wa.me` WhatsApp bill link work today.
