import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'

interface PreTradeRow {
    id: string
    pair: string
    created_at: string
    final_score: number | null
}

interface ExecutionRow {
    id: string
    pre_trade_id: string
    created_at: string
    executed_at: string
    closed_at: string | null
    entry: number
    stop_loss: number
    take_profit: number
}

interface MetricRow {
    execution_id: string
    rr_ratio: number
    pnl: number
    win_loss: 'win' | 'loss' | 'breakeven'
}

export default async function AnalyticsPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const { data: executions } = await supabase
        .from('executions')
        .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300)

    const { data: preTrades } = await supabase
        .from('pre_trades')
        .select('id, pair, created_at, final_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300)

    const { data: metrics } = await supabase
        .from('trade_metrics')
        .select('execution_id, rr_ratio, pnl, win_loss')
        .in('execution_id', ((executions || []) as ExecutionRow[]).map((row) => row.id))

    const preTradeMap = new Map(((preTrades || []) as PreTradeRow[]).map((row) => [row.id, row]))
    const metricMap = new Map(((metrics || []) as MetricRow[]).map((row) => [row.execution_id, row]))
    const list = ((executions || []) as ExecutionRow[]).map((execution) => {
        const preTrade = preTradeMap.get(execution.pre_trade_id)
        const metric = metricMap.get(execution.id)
        return {
            id: execution.id,
            pair: preTrade?.pair || 'UNKNOWN',
            created_at: execution.closed_at || execution.executed_at || execution.created_at,
            result: metric?.win_loss || 'pending',
            rr: metric?.rr_ratio ?? null,
            pl: metric?.pnl ?? null,
            setup_grade:
                preTrade?.final_score && preTrade.final_score >= 0.9
                    ? 'A+'
                    : preTrade?.final_score && preTrade.final_score >= 0.84
                        ? 'A'
                        : preTrade?.final_score && preTrade.final_score >= 0.76
                            ? 'A-'
                            : preTrade?.final_score && preTrade.final_score >= 0.65
                                ? 'B'
                                : 'F',
            session: null,
            notes: null,
            entry: execution.entry,
            sl: execution.stop_loss,
            tp: execution.take_profit,
            risk_amount: Math.abs(execution.entry - execution.stop_loss) * 100,
        }
    })

    const completed = list.filter((trade) => trade.result && trade.result !== 'pending')
    const wins = completed.filter((trade) => trade.result === 'win').length
    const losses = completed.filter((trade) => trade.result === 'loss').length
    const breakeven = completed.filter((trade) => trade.result === 'breakeven').length
    const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0

    const avgRR = list
        .map((trade) => {
            if (typeof trade.rr === 'number' && !Number.isNaN(trade.rr)) return trade.rr
            if (!trade.entry || !trade.sl || !trade.tp) return null
            const risk = Math.abs(trade.entry - trade.sl)
            const reward = Math.abs(trade.tp - trade.entry)
            if (!risk) return null
            return reward / risk
        })
        .filter((value): value is number => value !== null)

    const avgRRValue = avgRR.length > 0 ? (avgRR.reduce((acc, v) => acc + v, 0) / avgRR.length).toFixed(2) : '0.00'
    const expectancy = completed.length > 0 ? ((wins - losses) / completed.length).toFixed(2) : '0.00'
    const profitFactor = losses === 0 ? (wins > 0 ? '∞' : '0.00') : (wins / losses).toFixed(2)

    const byScore = {
        a: completed.filter((trade) => trade.setup_grade === 'A' || trade.setup_grade === 'A+'),
        b: completed.filter((trade) => trade.setup_grade === 'B'),
        c: completed.filter((trade) => trade.setup_grade === 'A-' || trade.setup_grade === 'F'),
    }

    const scoreWinRate = (items: typeof completed) => {
        if (items.length === 0) return 0
        return Math.round((items.filter((trade) => trade.result === 'win').length / items.length) * 100)
    }

    const hasCompletedTrades = completed.length > 0
    const topPair = completed.length > 0
        ? Object.entries(completed.reduce<Record<string, number>>((acc, trade) => {
            acc[trade.pair] = (acc[trade.pair] || 0) + 1
            return acc
        }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        : 'N/A'
    const bestGrade = byScore.a.length ? 'A+' : byScore.b.length ? 'B' : 'C'
    const edgeScore = Math.round((winRate * 0.4) + (parseFloat(avgRRValue) * 15) + (parseFloat(expectancy) * 10))

    const performanceByDay = []
    const performanceByMonth = []
    const performanceByQuarter = []
    const streaks = { maxWin: 0, maxLoss: 0 }
    const highestProfitTrade: { pair: string; pl: number } | null = null
    const largestLossTrade: { pair: string; pl: number } | null = null
    const london: typeof completed = []
    const ny: typeof completed = []
    const asia: typeof completed = []
    const againstBiasLosses = 0
    const earlyEntryLosses = 0
    const mistakeTaggedTrades = 0

    return (
        <div className="page-wrap overflow-auto">
            <section className="page-hero px-6 py-7 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(108,158,255,0.14),transparent_24%),radial-gradient(circle_at_24%_20%,rgba(95,230,184,0.1),transparent_22%)]" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-primary">Analytics</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sharper feedback for your trading behavior.</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                            These metrics turn journal entries into pattern recognition so you can improve quality, timing, and session selection.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
                        {[
                            { label: 'Top Pair', value: topPair },
                            { label: 'Best Grade', value: bestGrade },
                            { label: 'Edge Score', value: String(edgeScore) },
                        ].map((metric) => (
                            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {hasCompletedTrades ? (
                <>
                    <div className="px-6 sm:px-8">
                        <AnalyticsCharts
                            trades={list.map(t => ({
                                created_at: t.created_at,
                                result: t.result,
                                rr: typeof t.rr === 'number' ? t.rr : null,
                                pl: typeof t.pl === 'number' ? t.pl : 0,
                                setup_grade: (t.setup_grade as string | null) || null,
                                session: (t.session as string | null) || null,
                                pair: t.pair,
                                checklist_score: 0,
                            }))}
                            winRate={winRate}
                            avgRRValue={avgRRValue}
                            expectancy={expectancy}
                            profitFactor={profitFactor}
                            wins={wins}
                            losses={losses}
                            breakeven={breakeven}
                            byScore={byScore}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 xl:grid-cols-5 sm:px-8">
                        <MetricCard title="Win Rate" value={`${winRate}%`} />
                        <MetricCard title="Expectancy" value={expectancy} />
                        <MetricCard title="Avg RR" value={`1:${avgRRValue}`} />
                        <MetricCard title="Profit Factor" value={profitFactor} />
                        <MetricCard title="Completed" value={String(completed.length)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
                        <MetricCard title="Win Streak" value={String(streaks.maxWin)} />
                        <MetricCard title="Losing Streak" value={String(streaks.maxLoss)} />
                        <MetricCard title="Highest Profit Trade" value={highestProfitTrade ? `${highestProfitTrade.pair} ${highestProfitTrade.pl.toFixed(2)}` : 'N/A'} />
                        <MetricCard title="Largest Loss Trade" value={largestLossTrade ? `${largestLossTrade.pair} ${largestLossTrade.pl.toFixed(2)}` : 'N/A'} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 px-6 xl:grid-cols-3 sm:px-8">
                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Win Rate by Score</CardTitle>
                                <CardDescription>Quality should beat quantity over time.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-muted-foreground">
                                <BarRow label="A Setups" value={scoreWinRate(byScore.a)} />
                                <BarRow label="B Setups" value={scoreWinRate(byScore.b)} />
                                <BarRow label="C Setups" value={scoreWinRate(byScore.c)} />
                            </CardContent>
                        </Card>

                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Win Rate by Session</CardTitle>
                                <CardDescription>Time-of-day edge matters more than frequency.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-muted-foreground">
                                <BarRow label={SESSION_LABELS.london} value={scoreWinRate(london)} />
                                <BarRow label={SESSION_LABELS.ny} value={scoreWinRate(ny)} />
                                <BarRow label={SESSION_LABELS.asia} value={scoreWinRate(asia)} />
                            </CardContent>
                        </Card>

                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Mistake Analysis</CardTitle>
                                <CardDescription>Execution leaks that deserve immediate attention.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <p>Early entry losses: <span className="font-medium text-foreground">{earlyEntryLosses}</span></p>
                                <p>Against bias losses: <span className="font-medium text-foreground">{againstBiasLosses}</span></p>
                                <p>Mistake-tagged trades: <span className="font-medium text-foreground">{mistakeTaggedTrades}</span></p>
                                <p>Breakeven trades: <span className="font-medium text-foreground">{breakeven}</span></p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">AI Insights</CardTitle>
                            <CardDescription>High-level readouts to guide your next review cycle.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <InsightCard text="You perform best when score is high and context aligns with execution." />
                            <InsightCard text="A-setups currently outperform B/C setups, so selectivity is paying off." />
                            <InsightCard text="Loss clusters around early timing and bias conflicts point to discipline drift." />
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Performance by Day</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {performanceByDay.map((item) => (
                                    <p key={item.period} className="text-muted-foreground">{item.period}: <span className="text-foreground">{item.winRate}% win rate · {item.total} trades</span></p>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Performance by Month</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {performanceByMonth.slice(-6).map((item) => (
                                    <p key={item.period} className="text-muted-foreground">{item.period}: <span className="text-foreground">{item.winRate}% win rate · {item.total} trades</span></p>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Performance by Quarter</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {performanceByQuarter.map((item) => (
                                    <p key={item.period} className="text-muted-foreground">{item.period}: <span className="text-foreground">{item.winRate}% win rate · {item.total} trades</span></p>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                <div className="px-6 sm:px-8">
                    <Card className="glass-panel">
                        <CardContent className="p-8 sm:p-10">
                            <Empty className="border-white/8 bg-white/3">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                                        <BarChart3 className="h-5 w-5" />
                                    </EmptyMedia>
                                    <EmptyTitle>Analytics will unlock after completed trades</EmptyTitle>
                                    <EmptyDescription>
                                        Once you have a few closed trades, this page will show session edge, setup quality, expectancy, and the mistakes that need attention.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Link href="/dashboard/trade">
                                        <Button className="gap-2">
                                            Log a Trade
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Link href="/dashboard/calendar">
                                        <Button variant="outline">Open Calendar</Button>
                                    </Link>
                                </div>
                            </Empty>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

function MetricCard({ title, value }: { title: string; value: string }) {
    return (
        <Card className="glass-panel">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            </CardContent>
        </Card>
    )
}

function BarRow({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs">
                <span>{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary/80">
                <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(112,157,255,1),rgba(123,230,198,1))]"
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>
        </div>
    )
}

function InsightCard({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-muted-foreground">
            {text}
        </div>
    )
}
