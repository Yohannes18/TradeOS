'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfessionalCalendar, type ProfessionalCalendarDay } from '@/components/dashboard/professional-calendar'
import type { ChecklistStatus } from '@/lib/trading/types'

interface DashboardMetric {
    label: string
    value: string
    tone?: 'profit' | 'loss' | 'neutral'
    sparkline: number[]
}

interface DashboardTrade {
    id: string
    pair: string
    created_at: string
    result?: string | null
    rr?: number | null
    setup_grade?: string | null
    ai_recommendation?: string | null
}

interface ProfessionalDashboardProps {
    metrics: DashboardMetric[]
    calendarData: ProfessionalCalendarDay[]
    trades: DashboardTrade[]
    score: number
    checklistStatus: ChecklistStatus
    macroReport: {
        aiBias: string
        alert: string
        plan: string
    }
}

export function ProfessionalDashboard({ metrics, calendarData, trades, score, checklistStatus, macroReport }: ProfessionalDashboardProps) {
    const [month, setMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [widgetOrder, setWidgetOrder] = useState(['calendar', 'score'] as Array<'calendar' | 'score'>)

    const recentTrades = trades.slice(0, 6)
    const selectedTrades = useMemo(
        () => (selectedDate ? trades.filter((trade) => trade.created_at.slice(0, 10) === selectedDate) : []),
        [selectedDate, trades],
    )

    const moveWidget = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction
        if (nextIndex < 0 || nextIndex >= widgetOrder.length) return
        const copy = [...widgetOrder]
        const [item] = copy.splice(index, 1)
        copy.splice(nextIndex, 0, item)
        setWidgetOrder(copy)
    }

    return (
        <div className="page-wrap overflow-auto">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <Card key={metric.label} className="glass-panel interactive-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">{metric.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className={`text-3xl font-semibold tracking-tight ${metric.tone === 'profit' ? 'text-profit' : metric.tone === 'loss' ? 'text-loss' : ''}`}>
                                {metric.value}
                            </p>
                            <div className="flex items-end gap-1" aria-label={`${metric.label} sparkline`}>
                                {metric.sparkline.map((value, idx) => (
                                    <span key={idx} className="w-2 rounded-full bg-primary/70" style={{ height: `${10 + value}px` }} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {[
                    { title: 'AI Market Bias', body: macroReport.aiBias },
                    { title: 'Alerts', body: macroReport.alert },
                    { title: 'Today’s Plan', body: macroReport.plan },
                ].map((card) => (
                    <Card key={card.title} className="glass-panel interactive-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{card.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">{card.body}</CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                    {widgetOrder.map((widget, index) => (
                        <div key={widget} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon-sm" onClick={() => moveWidget(index, -1)} aria-label="Move widget up">
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon-sm" onClick={() => moveWidget(index, 1)} aria-label="Move widget down">
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                            </div>
                            {widget === 'calendar' ? (
                                <ProfessionalCalendar
                                    month={month}
                                    onMonthChange={setMonth}
                                    data={calendarData}
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                />
                            ) : (
                                <Card className="glass-panel">
                                    <CardHeader>
                                        <CardTitle className="text-base">Zella Score Panel</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Process Score</p>
                                            <p className="mt-1 text-3xl font-semibold">{score}</p>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checklist Status</p>
                                            <p className="mt-1 text-xl font-semibold">{checklistStatus}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))}
                </div>

                <Card className="glass-panel h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Recent Trades + Cumulative P/L</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex h-20 items-end gap-1 rounded-xl border border-white/10 bg-white/5 p-3">
                            {recentTrades.map((trade, idx) => (
                                <span key={trade.id} className="w-full rounded-sm bg-emerald-500/70" style={{ height: `${20 + (idx % 4) * 10}px` }} />
                            ))}
                        </div>
                        {recentTrades.map((trade) => (
                            <div key={trade.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                                <p className="font-medium">{trade.pair}</p>
                                <p className="text-xs text-muted-foreground">{new Date(trade.created_at).toLocaleString()} · {trade.result || 'pending'}</p>
                            </div>
                        ))}
                        {selectedDate ? (
                            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-muted-foreground">
                                {selectedDate} selected · {selectedTrades.length} trades
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <Link href="/dashboard/trade" className="fixed bottom-6 right-6 z-30">
                <Button className="h-12 rounded-full px-5 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Trade
                </Button>
            </Link>
        </div>
    )
}
