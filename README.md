Here is a **clean, professional, production-grade README**—structured like a real SaaS product, easy to scan, and aligned with how serious engineering teams document systems.

---

# 🚀 TradeOS

**TradeOS** is a structured trading workspace designed to help traders plan, execute, and review trades with discipline and consistency.

It enforces a professional workflow:
**PreTrade → Execution → Journal → Analytics**

---

## ✨ Core Features

### 🧠 Pre-Trade System

* Structured checklist validation before entering trades
* Scoring engine with rule-based discipline tracking
* Bias and confidence logging

### 📉 Execution Engine

* Controlled trade lifecycle with validation gates
* Risk-aware position sizing
* Immutable execution records

### 📓 Journal System

* One-to-one trade journaling
* Performance tracking and review
* Behavioral and strategy insights

### 📊 Analytics

* Trade performance metrics
* Risk and consistency tracking
* Strategy evaluation

### ⚙️ User Settings

* Personalized trading preferences
* Risk configuration
* Workflow customization

---

## 🏗️ Tech Stack

**Frontend**

* Next.js 16 (App Router)
* React 19
* TypeScript
* Tailwind CSS + Radix UI

**Backend / Infrastructure**

* Supabase (Auth, Database, Storage)
* PostgreSQL with RLS (Row-Level Security)

**AI & Data (Optional)**

* Gemini API
* DeepSeek API
* Alpha Vantage (Market Data)
* Finnhub (Market Data)
* RSS feeds (X / Twitter via Nitter)

---

## 📋 Prerequisites

* Node.js **20+**
* npm / pnpm / yarn
* Supabase project

---

## ⚙️ Environment Setup

Create environment file:

```bash
cp .env.example .env.local
```

### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

### Optional (Auth Enhancements)

```env
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=
BETTER_AUTH_ENABLED=false
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
NEXT_PUBLIC_BETTER_AUTH_ENABLED=false
NEXT_PUBLIC_BETTER_AUTH_URL=
```

### Optional (AI + Analysis)

```env
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
```

### Optional (Market News)

```env
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
X_NEWS_RSS_URL=
```

### Optional (Macro Confidence Weights)

```env
MACRO_CONFIDENCE_CHECKLIST_WEIGHT=0.5
MACRO_CONFIDENCE_MACRO_WEIGHT=0.3
MACRO_CONFIDENCE_INDEX_WEIGHT=0.2
```

> ⚠️ Weights are automatically normalized at runtime.

---

## 🧠 AI Behavior

* If API keys are provided → AI-powered analysis is enabled
* If not → system falls back to built-in heuristic engine

---

## 🗄️ Database Setup (Supabase)

### Step 1 — Initial Bootstrap

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Run:

```
scripts/000_init_system.sql
```

---

### Step 2 — Trading Ecosystem Upgrade

Run:

```
scripts/003_trading_ecosystem_upgrade.sql
```

---

### This Creates:

* `settings`
* `trades` (legacy, may be deprecated in new workflow)
* `checklist_logs`
* `profiles`
* `trade_images`
* `economic_events`

Also includes:

* Row-Level Security (RLS)
* Default user settings trigger
* Backfill for existing users

---

## ▶️ Running Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 📦 Available Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Run production build
npm run lint    # Lint codebase
```

---

## 🚀 Deployment (Vercel)

1. Import project into Vercel
2. Add environment variables
3. Deploy

---

## 📁 Project Structure

```
app/                 → Routes & pages
components/          → UI & feature components
lib/supabase/        → Supabase helpers
scripts/             → SQL migrations & setup
```

---

## 🔐 Authentication

* Powered by Supabase Auth
* Supports OAuth (Google, Apple)

### Callback URLs:

**Production**

```
https://YOUR_DOMAIN/auth/callback
```

**Local**

```
http://localhost:3000/auth/callback
```

---

## ⚠️ Important Notes

* App can render without Supabase, but:

  * Auth will not work
  * Data persistence will fail

* Never commit `.env.local`

* Legacy `trades` table may still exist:

  * Recommended to migrate fully to
    **PreTrade → Execution → Journal** system

---

## 🧭 System Philosophy

TradeOS is built around one principle:

> **Consistency beats randomness in trading.**

The system enforces:

* disciplined entries
* structured execution
* reflective journaling

---

## 🧪 Current Status

* ✅ Core trading workflow implemented
* ⚠️ AI + News integration requires stabilization
* ⚠️ Possible legacy system remnants depending on branch

---

## 📌 Roadmap (Suggested)

* Full AI-driven trade assistant
* Real-time news intelligence engine
* Advanced analytics dashboard
* Mobile optimization

