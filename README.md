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

## Database Initialization (Supabase)

If your Supabase database is empty, run the bootstrap script once:

1. Open Supabase Dashboard → SQL Editor
2. Open `scripts/000_init_system.sql`
3. Paste and run the script

The script creates:

- `public.settings`
- `public.trades`
- `public.checklist_logs`
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
