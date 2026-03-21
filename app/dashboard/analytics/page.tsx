import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { normalizeSessionValue, SESSION_LABELS } from '@/lib/session'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AnalyticsPage() {
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
        .limit(300)

    const list = trades || []

    const getEffectiveScore = (trade: Record<string, unknown>) => {
        const checklistScore = trade.checklist_score as number | null | undefined
        const score = trade.score as number | null | undefined
        return checklistScore ?? score ?? 0
    }

    const getSessionKey = (trade: Record<string, unknown>) => normalizeSessionValue(
        (trade.session as string | null | undefined) ?? null,
        (trade.notes as string | null | undefined) ?? null,
    )

    const hasMistake = (trade: Record<string, unknown>) => {
        const mistake = trade.mistake as string[] | null | undefined
        if (Array.isArray(mistake) && mistake.length > 0) return true
        return String(trade.notes || '').toLowerCase().includes('mistake')
    }

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
        a: completed.filter((trade) => {
            const setupGrade = trade.setup_grade as string | null | undefined
            return setupGrade ? setupGrade === 'A' : getEffectiveScore(trade) >= 8
        }),
        b: completed.filter((trade) => {
            const setupGrade = trade.setup_grade as string | null | undefined
            if (setupGrade) return setupGrade === 'B'
            const score = getEffectiveScore(trade)
            return score >= 6 && score < 8
        }),
        c: completed.filter((trade) => {
            const setupGrade = trade.setup_grade as string | null | undefined
            if (setupGrade) return setupGrade === 'C'
            const score = getEffectiveScore(trade)
            return score >= 4 && score < 6
        }),
    }

    const scoreWinRate = (items: typeof completed) => {
        if (items.length === 0) return 0
        return Math.round((items.filter((trade) => trade.result === 'win').length / items.length) * 100)
    }

    const london = completed.filter((trade) => getSessionKey(trade) === 'london')
    const ny = completed.filter((trade) => getSessionKey(trade) === 'ny')
    const asia = completed.filter((trade) => getSessionKey(trade) === 'asia')

    const againstBiasLosses = completed.filter((trade) => {
        if (trade.result !== 'loss') return false
        const notes = (trade.notes || '').toLowerCase()
        return notes.includes('against bias') || notes.includes('counter trend')
    }).length

    const earlyEntryLosses = completed.filter((trade) => {
        if (trade.result !== 'loss') return false
        const notes = (trade.notes || '').toLowerCase()
        return notes.includes('early') || notes.includes('chase')
    }).length

    const mistakeTaggedTrades = completed.filter((trade) => hasMistake(trade)).length
    const hasCompletedTrades = completed.length > 0

    return (
        <div className="page-wrap overflow-auto">
            <section className="page-hero px-6 py-7 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(108,158,255,0.14),transparent_24%),radial-gradient(circle_at_24%_20%,rgba(95,230,184,0.1),transparent_22%)]" />
                <div className="relative">
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">Analytics</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sharper feedback for your trading behavior.</h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        These metrics turn journal entries into pattern recognition so you can improve quality, timing, and session selection.
                    </p>
                </div>
            </section>

            {hasCompletedTrades ? (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <MetricCard title="Win Rate" value={`${winRate}%`} />
                        <MetricCard title="Expectancy" value={expectancy} />
                        <MetricCard title="Avg RR" value={`1:${avgRRValue}`} />
                        <MetricCard title="Profit Factor" value={profitFactor} />
                        <MetricCard title="Completed" value={String(completed.length)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
                </>
            ) : (
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
