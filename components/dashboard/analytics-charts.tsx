'use client'

import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AnalyticsTrade {
    created_at: string
    result: string | null
    rr: number | null
    pl: number | null
    setup_grade: string | null
    session: string | null
    pair: string
    checklist_score?: number | null
}

interface AnalyticsChartsProps {
    trades: AnalyticsTrade[]
    winRate: number
    avgRRValue: string
    expectancy: string
    profitFactor: string
    wins: number
    losses: number
    breakeven: number
    byScore: {
        a: AnalyticsTrade[]
        b: AnalyticsTrade[]
        c: AnalyticsTrade[]
    }
}

const CHART_COLORS = {
    profit: 'oklch(0.70 0.18 145)',
    loss: 'oklch(0.55 0.22 25)',
    primary: 'oklch(0.69 0.17 240)',
    neutral: 'oklch(0.73 0.015 248)',
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-white/10 bg-[oklch(0.19_0.016_248)] p-3 text-xs shadow-xl">
            {label && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} className="font-semibold" style={{ color: p.value > 0 ? CHART_COLORS.profit : p.value < 0 ? CHART_COLORS.loss : CHART_COLORS.neutral }}>
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                </p>
            ))}
        </div>
    )
}

export function AnalyticsCharts({
    trades, winRate, avgRRValue, expectancy, profitFactor, wins, losses, breakeven, byScore,
}: AnalyticsChartsProps) {
    // Equity curve
    const equityCurve = (() => {
        let cumulative = 0
        return trades
            .filter(t => t.result && t.result !== 'pending')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((t, i) => {
                cumulative += t.pl || 0
                return { trade: i + 1, equity: parseFloat(cumulative.toFixed(2)), pl: t.pl || 0 }
            })
    })()

    // Win/Loss by pair
    const byPair = (() => {
        const map: Record<string, { wins: number; losses: number; total: number }> = {}
        trades.filter(t => t.result && t.result !== 'pending').forEach(t => {
            if (!map[t.pair]) map[t.pair] = { wins: 0, losses: 0, total: 0 }
            map[t.pair].total++
            if (t.result === 'win') map[t.pair].wins++
            else if (t.result === 'loss') map[t.pair].losses++
        })
        return Object.entries(map)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 8)
            .map(([pair, s]) => ({
                pair,
                winRate: s.total ? Math.round(s.wins / s.total * 100) : 0,
                wins: s.wins,
                losses: s.losses,
            }))
    })()

    // Monthly P/L
    const monthlyPL = (() => {
        const map: Record<string, number> = {}
        trades.filter(t => t.pl !== null).forEach(t => {
            const key = new Date(t.created_at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
            map[key] = (map[key] || 0) + (t.pl || 0)
        })
        return Object.entries(map).slice(-12).map(([month, pl]) => ({ month, pl: parseFloat(pl.toFixed(2)) }))
    })()

    // Result distribution
    const resultDist = [
        { name: 'Wins', value: wins, color: CHART_COLORS.profit },
        { name: 'Losses', value: losses, color: CHART_COLORS.loss },
        { name: 'Breakeven', value: breakeven, color: CHART_COLORS.primary },
    ].filter(d => d.value > 0)

    // Setup grade performance
    const gradePerf = [
        { grade: 'A+', trades: byScore.a.length, winRate: byScore.a.length ? Math.round(byScore.a.filter(t => t.result === 'win').length / byScore.a.length * 100) : 0 },
        { grade: 'B', trades: byScore.b.length, winRate: byScore.b.length ? Math.round(byScore.b.filter(t => t.result === 'win').length / byScore.b.length * 100) : 0 },
        { grade: 'C', trades: byScore.c.length, winRate: byScore.c.length ? Math.round(byScore.c.filter(t => t.result === 'win').length / byScore.c.length * 100) : 0 },
    ]

    return (
        <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: 'Win Rate', value: `${winRate}%`, tone: winRate >= 55 ? 'profit' : winRate >= 45 ? '' : 'loss' },
                    { label: 'Profit Factor', value: profitFactor, tone: parseFloat(profitFactor) >= 1.5 ? 'profit' : parseFloat(profitFactor) >= 1 ? '' : 'loss' },
                    { label: 'Avg R:R', value: avgRRValue, tone: parseFloat(avgRRValue) >= 2 ? 'profit' : '' },
                    { label: 'Expectancy', value: expectancy, tone: parseFloat(expectancy) > 0 ? 'profit' : 'loss' },
                ].map(k => (
                    <div key={k.label} className="glass-panel interactive-panel rounded-xl p-4">
                        <p className="text-xs text-muted-foreground">{k.label}</p>
                        <p className={cn('mt-2 text-3xl font-semibold tracking-tight', k.tone === 'profit' ? 'text-profit' : k.tone === 'loss' ? 'text-loss' : '')}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Equity curve */}
            {equityCurve.length > 1 && (
                <Card className="glass-panel">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Equity Curve</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={equityCurve}>
                                <defs>
                                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.profit} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={CHART_COLORS.profit} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="trade" tick={{ fontSize: 11, fill: CHART_COLORS.neutral }} tickLine={false} axisLine={false} label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: CHART_COLORS.neutral }} />
                                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.neutral }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="equity" name="Equity" stroke={CHART_COLORS.profit} fill="url(#equityGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Monthly P/L */}
                {monthlyPL.length > 1 && (
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Monthly P/L</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={monthlyPL}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.neutral }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.neutral }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="pl" name="P/L" radius={[4, 4, 0, 0]}>
                                        {monthlyPL.map((entry, i) => (
                                            <Cell key={i} fill={entry.pl >= 0 ? CHART_COLORS.profit : CHART_COLORS.loss} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Result distribution */}
                {resultDist.length > 0 && (
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Result Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-6">
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie data={resultDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                        {resultDist.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {resultDist.map(d => (
                                    <div key={d.name} className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                                        <span className="text-sm text-muted-foreground">{d.name}</span>
                                        <span className="ml-auto text-sm font-semibold">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Win rate by pair */}
                {byPair.length > 0 && (
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Win Rate by Symbol</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {byPair.map(row => (
                                    <div key={row.pair}>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{row.pair}</span>
                                            <span className={cn('font-semibold', row.winRate >= 60 ? 'text-profit' : row.winRate >= 50 ? '' : 'text-loss')}>
                                                {row.winRate}%
                                            </span>
                                        </div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                                            <div className="h-full rounded-full bg-primary/70 transition-all duration-500"
                                                style={{ width: `${row.winRate}%` }} />
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{row.wins}W / {row.losses}L</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Setup grade performance */}
                {gradePerf.some(g => g.trades > 0) && (
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Performance by Setup Grade</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {gradePerf.filter(g => g.trades > 0).map(g => (
                                <div key={g.grade} className="flex items-center gap-4">
                                    <Badge variant="outline" className={cn('w-10 text-center text-xs',
                                        g.grade === 'A+' ? 'border-profit/40 text-profit' : g.grade === 'B' ? 'border-blue-500/40 text-blue-400' : 'border-yellow-500/40 text-yellow-400')}>
                                        {g.grade}
                                    </Badge>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{g.trades} trades</span>
                                            <span className={g.winRate >= 60 ? 'text-profit' : ''}>{g.winRate}% win</span>
                                        </div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                                            <div className="h-full rounded-full transition-all" style={{
                                                width: `${g.winRate}%`,
                                                background: g.winRate >= 60 ? CHART_COLORS.profit : CHART_COLORS.primary,
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-muted-foreground">Higher checklist grades correlate with better execution outcomes.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
