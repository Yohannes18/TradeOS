'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp, CheckCircle, Calculator, BookOpen, Shield, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-4xl mx-auto text-balance leading-tight">
          Your Complete Pre-Trade
          <span className="text-primary"> Operating System</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          Stop gambling. Start trading with discipline. TradeOS helps you score every trade setup, 
          calculate position sizes, and journal your performance.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2">
              <TrendingUp className="h-5 w-5" />
              Start Trading Smarter
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={CheckCircle}
            title="Pre-Trade Checklist"
            description="Score your setups with a structured 5-point checklist. Only take high-probability trades."
            color="text-profit bg-profit/10"
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
            color="text-chart-4 bg-chart-4/10"
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
            color="text-loss bg-loss/10"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Performance Tracking"
            description="See your stats at a glance. Win rate, total trades, and average checklist score."
            color="text-profit bg-profit/10"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center p-10 rounded-2xl border border-border bg-card">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-balance">
            Ready to trade with discipline?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join traders who use TradeOS to improve their decision-making and protect their capital.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2">
              <TrendingUp className="h-5 w-5" />
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built for traders, by traders. TradeOS helps you trade smarter, not harder.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ElementType
  title: string
  description: string
  color: string 
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
