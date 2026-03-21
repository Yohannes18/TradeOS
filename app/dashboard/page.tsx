import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, ShieldAlert, Sparkles, Target, TrendingUp } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const totalTrades = trades?.length || 0
  const completed = (trades || []).filter((trade) => trade.result && trade.result !== 'pending')
  const wins = completed.filter((trade) => trade.result === 'win').length
  const losses = completed.filter((trade) => trade.result === 'loss').length
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0
  const avgScore = totalTrades > 0
    ? Math.round(((trades || []).reduce((acc, trade) => acc + (trade.score || 0), 0) / totalTrades) * 10) / 10
    : 0
  const bestSetup = (trades || []).reduce((best, trade) => {
    if ((trade.score || 0) > (best.score || 0)) return trade
    return best
  }, { pair: '-', score: 0 } as { pair: string; score?: number })
  const profitFactor = losses === 0 ? (wins > 0 ? '∞' : '0.00') : (wins / losses).toFixed(2)
  const hasTrades = totalTrades > 0

  return (
    <div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(121,164,255,0.16),transparent_26%),radial-gradient(circle_at_20%_22%,rgba(96,228,187,0.1),transparent_22%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-primary">
              <Activity className="h-3.5 w-3.5" />
              Daily Command View
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your trading process, summarized in one clean view.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Review your edge, spot discipline drift early, and keep your best setups visible without clutter.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
            <Snapshot label="Completed" value={String(completed.length)} />
            <Snapshot label="Wins" value={String(wins)} />
            <Snapshot label="Losses" value={String(losses)} />
          </div>
        </div>
      </section>

      {hasTrades ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <MetricCard title="Win Rate" value={`${winRate}%`} tone="profit" />
            <MetricCard title="Profit Factor" value={profitFactor} />
            <MetricCard title="Total Trades" value={String(totalTrades)} />
            <MetricCard title="Best Setup" value={`${bestSetup.pair} (${bestSetup.score || 0}/10)`} compact />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> AI Market Bias</CardTitle>
                <CardDescription>Contextual signals that help reinforce selective execution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Bias updates live in Trade → AI Analysis mode.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Gold: Dynamic</Badge>
                  <Badge variant="outline">Indices: Dynamic</Badge>
                  <Badge variant="outline">Confidence: Dynamic</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" /> Alerts</CardTitle>
                <CardDescription>Important risk notes and trade-quality pressure points.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>High-impact events and macro conflicts are shown in AI Analysis.</p>
                <p>Average checklist score this cycle: <span className="text-foreground font-medium">{avgScore}/10</span></p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4" /> Today’s Plan</CardTitle>
                <CardDescription>Simple guardrails that keep quality ahead of activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Session focus: London / New York overlap.</p>
                <p>Plan: only A/B setups with macro alignment.</p>
                <p className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Avoid entries near high-impact releases.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-panel overflow-hidden">
            <CardHeader className="border-b border-white/8 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Process Readout
              </CardTitle>
              <CardDescription>TradeOS is strongest when your score, context, and execution stay aligned.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
              <Insight title="Stay selective" body="A-grade setups deserve more attention than more volume." />
              <Insight title="Protect timing" body="Average quality matters less if you keep forcing early entries." />
              <Insight title="Review weekly" body="Use the calendar and journal together so behavior trends stay visible." />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="glass-panel overflow-hidden">
          <CardContent className="p-8 sm:p-10">
            <Empty className="border-white/8 bg-white/3">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                  <Sparkles className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Start with your first logged trade</EmptyTitle>
                <EmptyDescription>
                  Once trades are logged, this command view will surface your win rate, process quality, macro context, and weekly review signals.
                </EmptyDescription>
              </EmptyHeader>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard/trade">
                  <Button className="gap-2">
                    Open Trade Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/journal">
                  <Button variant="outline">Review Journal Layout</Button>
                </Link>
              </div>
            </Empty>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  tone,
  compact = false,
}: {
  title: string
  value: string
  tone?: 'profit'
  compact?: boolean
}) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <p className={`font-semibold tracking-tight ${compact ? 'text-lg' : 'text-3xl'} ${tone === 'profit' ? 'text-profit' : 'text-foreground'}`}>
            {value}
          </p>
          <div className="rounded-2xl bg-white/6 p-2 text-muted-foreground">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}
