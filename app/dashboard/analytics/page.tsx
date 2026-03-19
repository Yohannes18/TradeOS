import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeSessionValue, SESSION_LABELS } from '@/lib/session'

export default async function AnalyticsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

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

    return (
        <div className="flex-1 p-4 space-y-4 overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <MetricCard title="Win Rate" value={`${winRate}%`} />
                <MetricCard title="Expectancy" value={expectancy} />
                <MetricCard title="Avg RR" value={`1:${avgRRValue}`} />
                <MetricCard title="Profit Factor" value={profitFactor} />
                <MetricCard title="Completed" value={String(completed.length)} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Win Rate by Score</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <BarRow label="A Setups" value={scoreWinRate(byScore.a)} />
                        <BarRow label="B Setups" value={scoreWinRate(byScore.b)} />
                        <BarRow label="C Setups" value={scoreWinRate(byScore.c)} />
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Win Rate by Session</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <BarRow label={SESSION_LABELS.london} value={scoreWinRate(london)} />
                        <BarRow label={SESSION_LABELS.ny} value={scoreWinRate(ny)} />
                        <BarRow label={SESSION_LABELS.asia} value={scoreWinRate(asia)} />
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Mistake Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>Early entry losses: <span className="text-foreground font-medium">{earlyEntryLosses}</span></p>
                        <p>Against bias losses: <span className="text-foreground font-medium">{againstBiasLosses}</span></p>
                        <p>Mistake-tagged trades: <span className="text-foreground font-medium">{mistakeTaggedTrades}</span></p>
                        <p>Breakeven trades: <span className="text-foreground font-medium">{breakeven}</span></p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border bg-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">AI Insights</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• You perform best when score is high and context aligns with execution.</p>
                    <p>• A-setups currently outperform B/C setups; prioritize quality over frequency.</p>
                    <p>• Loss clusters around “early” or “against bias” notes indicate timing/discipline leak.</p>
                </CardContent>
            </Card>
        </div>
    )
}

function MetricCard({ title, value }: { title: string; value: string }) {
    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
        </Card>
    )
}

function BarRow({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-1">
                <span>{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
            </div>
        </div>
    )
}
