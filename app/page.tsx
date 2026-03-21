'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp, CheckCircle, Calculator, BookOpen, Shield, BarChart3, ArrowRight, CalendarDays, BrainCircuit } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_30px_rgba(90,135,255,0.32)]">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="block text-xl font-semibold tracking-tight text-foreground">TradeOS</span>
              <span className="block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Trading Intelligence</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="page-hero px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,203,255,0.14),transparent_26%),radial-gradient(circle_at_20%_18%,rgba(105,239,191,0.1),transparent_20%)]" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-primary">
                <BrainCircuit className="h-3.5 w-3.5" />
                Built For Deliberate Traders
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                A cleaner trading workspace for
                <span className="text-gradient"> execution, journaling, and review.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                TradeOS brings checklist discipline, risk control, and performance feedback into one calm interface so your process feels premium before your results do.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="gap-2">
                    Start Trading Smarter
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline">Sign In</Button>
                </Link>
              </div>
              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                <StatPill value="A/B" label="Setup discipline" />
                <StatPill value="Daily" label="Review cadence" />
                <StatPill value="One" label="Unified workflow" />
              </div>
            </div>

            <div className="glass-panel rounded-[26px] p-5">
              <div className="rounded-[22px] border border-white/8 bg-black/10 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Today</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">Trading Control Center</p>
                  </div>
                  <div className="rounded-full border border-profit/25 bg-profit/10 px-3 py-1 text-xs font-medium text-profit">
                    Focused
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <PreviewCard icon={CheckCircle} title="Checklist Score" value="8.4 / 10" hint="High-quality setups only" />
                  <PreviewCard icon={CalendarDays} title="Journal Coverage" value="21 days" hint="Review patterns faster" />
                  <PreviewCard icon={BarChart3} title="Profit Factor" value="1.86" hint="Process over impulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-[28px] p-7">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Why it feels better</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Less clutter. Better focus. Stronger review loops.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              The product is designed to feel like a serious workspace, not a hobby dashboard. Every screen is built to reduce noise and make the next decision obvious.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <QuickValue label="Execution-first" description="Pre-trade to post-trade in one clean rhythm." />
            <QuickValue label="Risk-aware" description="Sizing and discipline stay visible." />
            <QuickValue label="Journal-driven" description="Patterns become measurable, not emotional." />
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Core Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">A modern product system for consistent traders.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={CheckCircle}
            title="Pre-Trade Checklist"
            description="Score your setups with a structured 5-point checklist. Only take high-probability trades."
            color="text-emerald-500 bg-emerald-500/10"
          />
          <FeatureCard
            icon={Calculator}
            title="Position Size Calculator"
            description="Never risk too much. Calculate the perfect position size based on your risk tolerance."
            color="text-primary bg-primary/10"
          />
          <FeatureCard
            icon={BookOpen}
            title="Trade Journal"
            description="Track every trade. Analyze your win rate, average score, and identify patterns."
            color="text-amber-500 bg-amber-500/10"
          />
          <FeatureCard
            icon={BarChart3}
            title="TradingView Integration"
            description="Quick access to charts. Open any symbol directly in TradingView from the dashboard."
            color="text-primary bg-primary/10"
          />
          <FeatureCard
            icon={Shield}
            title="Risk Management"
            description="Set your account balance and risk percentage. The calculator does the math for you."
            color="text-red-500 bg-red-500/10"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Performance Tracking"
            description="See your stats at a glance. Win rate, total trades, and average checklist score."
            color="text-emerald-500 bg-emerald-500/10"
          />
        </div>
        </section>

        <section className="page-hero px-6 py-8 text-center sm:px-8 lg:px-12">
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Start Strong</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to make the product feel as sharp as your trading process?
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Build your routine around cleaner entries, better journaling, and a dashboard that helps you think clearly under pressure.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline">Open Workspace</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>Built for traders who want a calmer workflow and a more professional product experience.</p>
        </div>
      </footer>
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function PreviewCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: ElementType
  title: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function QuickValue({ label, description }: { label: string; description: string }) {
  return (
    <div className="glass-panel rounded-[24px] p-5">
      <p className="text-base font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: ElementType
  title: string
  description: string
  color: string 
}) {
  return (
    <div className="glass-panel rounded-[26px] p-6 transition-transform duration-200 hover:-translate-y-1">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
