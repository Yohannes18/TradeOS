# TradeOS

TradeOS is a modern trading workspace for planning, executing, and reviewing trades with a structured process. It combines pre-trade validation, risk management, journaling, and account settings in one dashboard.

## Highlights

- Structured pre-trade checklist with score logging
- Risk calculator with position sizing workflow
- Trade journal with performance tracking
- User-specific settings and preferences
- Supabase authentication and data storage

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS + Radix UI components
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- A Supabase project

## Environment Setup

Create your local environment file:

```bash
cp .env.example .env.local
```

Set the following variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (optional, recommended for local auth redirect)
- `NEXT_PUBLIC_SITE_URL` (required for consistent OAuth callback redirects across environments)
- `BETTER_AUTH_ENABLED` (optional, defaults to `false`; enables Phase-1 Better Auth API scaffold)
- `BETTER_AUTH_URL` (optional for Better Auth; defaults to `NEXT_PUBLIC_SITE_URL`)
- `BETTER_AUTH_SECRET` (optional for Better Auth; required before production use)
- `NEXT_PUBLIC_BETTER_AUTH_ENABLED` (optional, defaults to `false`; enables Better Auth login/signup UI flow)
- `NEXT_PUBLIC_BETTER_AUTH_URL` (optional; Better Auth client base URL)
- `GEMINI_API_KEY` (optional, enables Gemini-powered analysis)
- `DEEPSEEK_API_KEY` (optional, enables DeepSeek-powered analysis)

If AI keys are not set, TradeOS will still run automated analysis using its built-in heuristic engine.

For OAuth providers, enable Google and Apple in Supabase Auth and add your callback URL:

- `https://YOUR_DOMAIN/auth/callback` (production)
- `http://localhost:3000/auth/callback` (local)

## Database Initialization (Supabase)

If your Supabase database is empty, run the bootstrap script once:

1. Open Supabase Dashboard → SQL Editor
2. Open `scripts/000_init_system.sql`
3. Paste and run the script

For the full trading ecosystem schema (profiles, advanced trade fields, trade images, economic events, and calendar RPC queries), run after bootstrap:

1. Open `scripts/003_trading_ecosystem_upgrade.sql`
2. Paste and run in Supabase SQL Editor

The script creates:

- `public.settings`
- `public.trades`
- `public.checklist_logs`
- `public.profiles`
- `public.trade_images`
- `public.economic_events`
- RLS policies for all application tables
- A trigger that auto-creates default settings for new users
- Backfill settings for existing users

## Running Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Open http://localhost:3000

## Available Scripts

- `npm run dev` — start local dev server
- `npm run build` — create production build
- `npm run start` — run production build locally
- `npm run lint` — run lint checks

## Deployment

Deploy on Vercel:

1. Import this project in Vercel (or use `vercel` CLI)
2. Add the same environment variables from `.env.local` in the Vercel project settings
3. Trigger deployment

## Project Structure

- `app/` — routes, layouts, and pages
- `components/` — UI and feature components
- `lib/supabase/` — Supabase server/client/middleware helpers
- `scripts/` — SQL schema and initialization scripts

## Notes

- The app supports running without Supabase env values for basic shell rendering, but authentication and data operations require valid Supabase configuration.
- Keep credentials in `.env.local`; do not commit secrets.
