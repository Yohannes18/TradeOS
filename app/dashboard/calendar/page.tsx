'use client'

import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProfessionalCalendar, type ProfessionalCalendarDay } from '@/components/dashboard/professional-calendar'
import { TradeResultDialog } from '@/components/dashboard/trade-result-dialog'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, MinusCircle, CalendarDays, Plus } from 'lucide-react'
import Link from 'next/link'

interface TradeRow {
    id: string
    pair: string
    created_at: string
    result: 'win' | 'loss' | 'breakeven' | 'pending' | null
    rr: number | null
    risk_amount: number | null
    setup_grade: string | null
    ai_recommendation: string | null
    entry: number | null
    sl: number | null
    tp: number | null
}

interface EconomicEvent {
    id: string
    title: string
    impact: string | null
    event_date: string | null
    event_time?: string | null
}

const IMPACT_COLORS: Record<string, string> = {
    high: 'border-loss/40 bg-loss/10 text-loss',
    medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    low: 'border-white/20 bg-white/5 text-muted-foreground',
}

export default function CalendarPage() {
    const supabase = createClient()
    const [month, setMonth] = useState(() => new Date())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [days, setDays] = useState<ProfessionalCalendarDay[]>([])
    const [selectedTrades, setSelectedTrades] = useState<TradeRow[]>([])
    const [events, setEvents] = useState<EconomicEvent[]>([])

    // Load month data
    useEffect(() => {
        const load = async () => {
            const start = format(startOfMonth(month), 'yyyy-MM-dd')
            const end = format(endOfMonth(month), 'yyyy-MM-dd')

            const [{ data: executions }, { data: preTrades }, { data: eventRows }] = await Promise.all([
                supabase
                    .from('executions')
                    .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit, risk_percent, position_size, status')
                    .gte('created_at', start)
                    .lte('created_at', end + 'T23:59:59'),
                supabase
                    .from('pre_trades')
                    .select('id, pair, created_at, final_score, ai_verdict')
                    .gte('created_at', start)
                    .lte('created_at', end + 'T23:59:59'),
                supabase
                    .from('economic_events')
                    .select('id, title, impact, event_date, event_time')
                    .gte('event_date', format(new Date(month.getFullYear() - 1, month.getMonth(), 1), 'yyyy-MM-dd'))
                    .lte('event_date', end),
            ])

            const executionIds = ((executions || []) as { id: string }[]).map((row) => row.id)
            const { data: metrics } = executionIds.length
                ? await supabase
                    .from('trade_metrics')
                    .select('execution_id, rr_ratio, pnl, win_loss')
                    .in('execution_id', executionIds)
                : { data: [] }

            setEvents((eventRows || []) as EconomicEvent[])

            const preTradeMap = new Map(((preTrades || []) as { id: string; pair: string; final_score: number | null; ai_verdict: string }[]).map((row) => [row.id, row]))
            const metricMap = new Map(((metrics || []) as { execution_id: string; rr_ratio: number; pnl: number; win_loss: 'win' | 'loss' | 'breakeven' }[]).map((row) => [row.execution_id, row]))

            const grouped = new Map<string, TradeRow[]>()
            for (const execution of (executions || []) as { id: string; pre_trade_id: string; created_at: string; executed_at: string; closed_at: string | null; entry: number; stop_loss: number; take_profit: number; status: string }[]) {
                const preTrade = preTradeMap.get(execution.pre_trade_id)
                const metric = metricMap.get(execution.id)
                const key = (execution.closed_at || execution.executed_at || execution.created_at).slice(0, 10)
                const list = grouped.get(key) || []
                list.push({
                    id: execution.id,
                    pair: preTrade?.pair || 'UNKNOWN',
                    created_at: execution.closed_at || execution.executed_at || execution.created_at,
                    result: metric?.win_loss || 'pending',
                    rr: metric?.rr_ratio ?? null,
                    risk_amount: Math.abs(execution.entry - execution.stop_loss) * 100,
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
                    ai_recommendation: preTrade?.ai_verdict || null,
                    entry: execution.entry,
                    sl: execution.stop_loss,
                    tp: execution.take_profit,
                })
                grouped.set(key, list)
            }

            const calDays: ProfessionalCalendarDay[] = []
            grouped.forEach((rows, date) => {
                const completed = rows.filter((r) => r.result && r.result !== 'pending')
                const wins = completed.filter((r) => r.result === 'win').length
                const netPnl = completed.reduce((sum, r) => {
                    if (r.result === 'win') return sum + (r.risk_amount || 0) * (r.rr || 1)
                    if (r.result === 'loss') return sum - (r.risk_amount || 0)
                    return sum
                }, 0)
                const rMultiple = completed.reduce((sum, r) => {
                    if (r.result === 'win') return sum + (r.rr || 1)
                    if (r.result === 'loss') return sum - 1
                    return sum
                }, 0)
                calDays.push({
                    date,
                    netPnl,
                    trades: rows.length,
                    rMultiple,
                    winRate: completed.length ? (wins / completed.length) * 100 : 0,
                    topSetup: rows.find((r) => r.setup_grade)?.setup_grade || undefined,
                    recommendation: netPnl > 0 ? 'CONFIRM' : netPnl < 0 ? 'WAIT' : 'INVALID',
                })
            })
            setDays(calDays)
        }
        load()
    }, [month])

    // Load selected day trades
    useEffect(() => {
        if (!selectedDate) { setSelectedTrades([]); return }
        const loadSelected = async () => {
            const { data: executions } = await supabase
                .from('executions')
                .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit, status')
                .gte('created_at', `${selectedDate}T00:00:00`)
                .lte('created_at', `${selectedDate}T23:59:59`)
                .order('created_at', { ascending: false })

            const { data: preTrades } = await supabase
                .from('pre_trades')
                .select('id, pair, final_score, ai_verdict')
                .in('id', ((executions || []) as { pre_trade_id: string }[]).map((row) => row.pre_trade_id))

            const { data: metrics } = await supabase
                .from('trade_metrics')
                .select('execution_id, rr_ratio, pnl, win_loss')
                .in('execution_id', ((executions || []) as { id: string }[]).map((row) => row.id))

            const preTradeMap = new Map(((preTrades || []) as { id: string; pair: string; final_score: number | null; ai_verdict: string }[]).map((row) => [row.id, row]))
            const metricMap = new Map(((metrics || []) as { execution_id: string; rr_ratio: number; pnl: number; win_loss: 'win' | 'loss' | 'breakeven' }[]).map((row) => [row.execution_id, row]))

            setSelectedTrades(((executions || []) as { id: string; pre_trade_id: string; created_at: string; executed_at: string; closed_at: string | null; entry: number; stop_loss: number; take_profit: number; status: string }[]).map((execution) => {
                const preTrade = preTradeMap.get(execution.pre_trade_id)
                const metric = metricMap.get(execution.id)
                return {
                    id: execution.id,
                    pair: preTrade?.pair || 'UNKNOWN',
                    created_at: execution.closed_at || execution.executed_at || execution.created_at,
                    result: metric?.win_loss || 'pending',
                    rr: metric?.rr_ratio ?? null,
                    risk_amount: Math.abs(execution.entry - execution.stop_loss) * 100,
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
                    ai_recommendation: preTrade?.ai_verdict || null,
                    entry: execution.entry,
                    sl: execution.stop_loss,
                    tp: execution.take_profit,
                }
            }))
        }
        loadSelected()
    }, [selectedDate])

    const selectedDay = useMemo(() => days.find((d) => d.date === selectedDate), [days, selectedDate])
    const selectedEvents = useMemo(
        () => (selectedDate ? events.filter((e) => e.event_date === selectedDate) : []),
        [events, selectedDate],
    )
    const eventHistoryMap = useMemo(() => {
        return events.reduce<Record<string, EconomicEvent[]>>((acc, event) => {
            const key = event.title.trim().toLowerCase()
            const list = acc[key] || []
            list.push(event)
            acc[key] = list.sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
            return acc
        }, {})
    }, [events])

    // Monthly stats
    const monthStats = useMemo(() => {
        const all = days.reduce((acc, d) => {
            acc.pl += d.netPnl
            acc.trades += d.trades
            acc.r += d.rMultiple
            return acc
        }, { pl: 0, trades: 0, r: 0 })
        return all
    }, [days])

    return (
        <div className="page-wrap grid grid-cols-1 gap-4 overflow-auto xl:grid-cols-[1fr_340px]">
            <div className="space-y-4">
                {/* Monthly stats bar */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Month P/L', value: `${monthStats.pl >= 0 ? '+' : ''}${monthStats.pl.toFixed(2)}`, tone: monthStats.pl >= 0 ? 'profit' : 'loss' },
                        { label: 'Total Trades', value: String(monthStats.trades), tone: 'neutral' },
                        { label: 'Month R', value: `${monthStats.r >= 0 ? '+' : ''}${monthStats.r.toFixed(1)}R`, tone: monthStats.r >= 0 ? 'profit' : 'loss' },
                    ].map((s) => (
                        <div key={s.label} className="glass-panel rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className={cn('mt-1 text-xl font-semibold', s.tone === 'profit' ? 'text-profit' : s.tone === 'loss' ? 'text-loss' : '')}>{s.value}</p>
                        </div>
                    ))}
                </div>
                <ProfessionalCalendar
                    month={month}
                    onMonthChange={setMonth}
                    data={days}
                    selectedDate={selectedDate}
                    onDateSelect={(d) => setSelectedDate((prev) => (prev === d ? null : d))}
                />
            </div>

            {/* Day sidebar */}
            <div className="space-y-3">
                {selectedDate ? (
                    <>
                        <Card className="glass-panel">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">
                                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </CardTitle>
                                    <Link href="/dashboard/trade">
                                        <Button size="sm" variant="outline" className="gap-1 border-white/10 bg-white/5 text-xs">
                                            <Plus className="h-3 w-3" /> Add
                                        </Button>
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {selectedDay ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'P/L', value: `${selectedDay.netPnl >= 0 ? '+' : ''}${selectedDay.netPnl.toFixed(2)}`, tone: selectedDay.netPnl >= 0 ? 'profit' : 'loss' },
                                            { label: 'R-Multiple', value: `${selectedDay.rMultiple >= 0 ? '+' : ''}${selectedDay.rMultiple.toFixed(1)}R`, tone: selectedDay.rMultiple >= 0 ? 'profit' : 'loss' },
                                            { label: 'Trades', value: String(selectedDay.trades), tone: 'neutral' },
                                            { label: 'Win Rate', value: `${Math.round(selectedDay.winRate)}%`, tone: selectedDay.winRate >= 55 ? 'profit' : 'neutral' },
                                        ].map((s) => (
                                            <div key={s.label} className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                                <p className={cn('mt-0.5 text-sm font-semibold', s.tone === 'profit' ? 'text-profit' : s.tone === 'loss' ? 'text-loss' : '')}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No trades on this day.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Trades list */}
                        {selectedTrades.length > 0 && (
                            <Card className="glass-panel">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Trades</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {selectedTrades.map((trade) => (
                                        <div key={trade.id} className={cn(
                                            'flex items-center justify-between rounded-xl border p-3 text-sm',
                                            trade.result === 'win' ? 'border-profit/20 bg-profit/6' : trade.result === 'loss' ? 'border-loss/20 bg-loss/6' : 'border-white/8 bg-white/4'
                                        )}>
                                            <div className="flex items-center gap-2">
                                                {trade.result === 'win' ? <TrendingUp className="h-3.5 w-3.5 text-profit" /> : trade.result === 'loss' ? <TrendingDown className="h-3.5 w-3.5 text-loss" /> : <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                                                <div>
                                                    <p className="font-medium">{trade.pair}</p>
                                                    <p className="text-xs text-muted-foreground">{trade.rr ? `${trade.rr.toFixed(1)}R` : '—'} · {trade.setup_grade || '—'}</p>
                                                </div>
                                            </div>
                                            <TradeResultDialog
                                                tradeId={trade.id}
                                                pair={trade.pair}
                                                currentResult={trade.result}
                                                riskAmount={trade.risk_amount}
                                                onUpdated={() => window.location.reload()}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Economic events */}
                        {selectedEvents.length > 0 && (
                            <Card className="glass-panel">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">News Calendar System</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {selectedEvents.map((event) => {
                                        const reaction = buildEventReaction(
                                            event,
                                            selectedDate,
                                            eventHistoryMap[event.title.trim().toLowerCase()] || [],
                                        )

                                        return (
                                            <div key={event.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {event.event_time || 'Time pending'} · {event.event_date}
                                                        </p>
                                                    </div>
                                                    {event.impact && (
                                                        <Badge variant="outline" className={cn('shrink-0 text-xs capitalize', IMPACT_COLORS[event.impact.toLowerCase()] || IMPACT_COLORS.low)}>
                                                            {event.impact}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                                                    <p>Last time this happened, market reacted like: <span className="text-foreground">{reaction.previousBehavior}</span></p>
                                                    <p>Historical reaction summary: <span className="text-foreground">{reaction.historicalReactionSummary}</span></p>
                                                    <p>Expected behavior: <span className="text-foreground">{reaction.expectedBehavior}</span></p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <Card className="glass-panel">
                        <CardContent className="flex flex-col items-center py-10 text-center">
                            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Click a day to see trades and events</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

function buildEventReaction(event: EconomicEvent, selectedDate: string, history: EconomicEvent[]) {
    const priorOccurrence = history
        .filter((item) => item.event_date && item.event_date < selectedDate)
        .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)))[0]

    const keyword = event.title.toLowerCase()
    const impact = (event.impact || 'low').toLowerCase()

    let expectedBehavior = 'Watch for a controlled reaction unless price is already resting at major liquidity.'
    let historicalReactionSummary = 'Previous releases of this event often create a short volatility burst followed by direction confirmation.'

    if (keyword.includes('cpi') || keyword.includes('inflation')) {
        expectedBehavior = 'Inflation data usually reprices DXY, yields, and gold first, then spills into indices.'
        historicalReactionSummary = 'Inflation surprises tend to create immediate USD repricing and sharp two-way candles around release.'
    } else if (keyword.includes('nfp') || keyword.includes('employment') || keyword.includes('job')) {
        expectedBehavior = 'Labor data often drives fast USD and gold displacement with follow-through if the surprise is large.'
        historicalReactionSummary = 'Employment releases typically create a liquidity sweep before the real direction confirms.'
    } else if (keyword.includes('fomc') || keyword.includes('rate') || keyword.includes('fed')) {
        expectedBehavior = 'Policy events can invalidate early moves, so wait for the second move and confirmation.'
        historicalReactionSummary = 'Rate decisions often create manipulation first, then directional expansion once the market digests guidance.'
    } else if (impact === 'high') {
        expectedBehavior = 'High-impact news should be treated as a volatility event that can invalidate weak structure.'
        historicalReactionSummary = 'High-impact events usually widen ranges and punish entries placed before confirmation.'
    }

    const previousBehavior = priorOccurrence
        ? `On ${priorOccurrence.event_date}, this event last appeared on your calendar and should be treated as a repeat volatility driver.`
        : 'No prior calendar instance was found, so treat it as a fresh volatility catalyst and wait for post-release confirmation.'

    return {
        previousBehavior,
        historicalReactionSummary,
        expectedBehavior,
    }
}
