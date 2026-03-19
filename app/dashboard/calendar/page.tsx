'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TradeRow {
    id: string
    trade_date?: string | null
    created_at: string
    result: 'win' | 'loss' | 'breakeven' | 'pending' | null
    notes: string | null
    rr?: number | null
}

interface EconomicEvent {
    id: string
    title: string
    impact: string | null
    event_date: string | null
}

export default function CalendarPage() {
    const [trades, setTrades] = useState<TradeRow[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [events, setEvents] = useState<EconomicEvent[]>([])

    useEffect(() => {
        const load = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('trades')
                .select('id, trade_date, created_at, result, notes, rr')
                .order('created_at', { ascending: false })
                .limit(400)
            setTrades((data as TradeRow[]) || [])

            try {
                const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
                const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
                const { data: eventRows } = await supabase
                    .from('economic_events')
                    .select('id, title, impact, event_date')
                    .gte('event_date', monthStart)
                    .lte('event_date', monthEnd)
                    .order('event_date', { ascending: true })
                    .limit(200)

                setEvents((eventRows as EconomicEvent[]) || [])
            } catch {
                setEvents([])
            }
        }
        load()
    }, [])

    const grouped = useMemo(() => {
        const map = new Map<string, TradeRow[]>()
        for (const trade of trades) {
            const key = trade.trade_date || new Date(trade.created_at).toISOString().slice(0, 10)
            const current = map.get(key) || []
            current.push(trade)
            map.set(key, current)
        }
        return map
    }, [trades])

    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const days = monthEnd.getDate()

    const selectedTrades = selectedDate ? grouped.get(selectedDate) || [] : []
    const dayEvents = selectedDate ? events.filter((event) => event.event_date === selectedDate) : []
    const completed = selectedTrades.filter((trade) => trade.result && trade.result !== 'pending')
    const wins = completed.filter((trade) => trade.result === 'win').length
    const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0

    return (
        <div className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-auto">
            <Card className="border-border bg-card xl:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Trade Calendar ({today.toLocaleString('default', { month: 'long' })})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-16 rounded-md border border-transparent" />
                        ))}

                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1
                            const date = new Date(today.getFullYear(), today.getMonth(), day)
                            const key = date.toISOString().slice(0, 10)
                            const items = grouped.get(key) || []
                            const dayEvents = events.filter((event) => event.event_date === key)
                            const totalRR = items.reduce((acc, trade) => {
                                const rr = trade.rr || 0
                                if (trade.result === 'win') return acc + rr
                                if (trade.result === 'loss') return acc - (rr || 1)
                                return acc
                            }, 0)
                            const tone = totalRR > 0 ? 'bg-profit/20 border-profit/30' : totalRR < 0 ? 'bg-loss/20 border-loss/30' : 'bg-secondary border-border'
                            const hasHighImpact = dayEvents.some((event) => (event.impact || '').toLowerCase() === 'high')

                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedDate(key)}
                                    className={`h-16 rounded-md border p-2 text-left ${tone} ${selectedDate === key ? 'ring-1 ring-primary' : ''}`}
                                >
                                    <p className="text-xs font-medium">{day}</p>
                                    <p className="text-[10px] text-muted-foreground">{items.length} trades</p>
                                    {hasHighImpact && <p className="text-[10px] text-chart-4">⚠️ High</p>}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Day Detail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {selectedDate ? (
                        <>
                            <p><span className="text-muted-foreground">Date:</span> {selectedDate}</p>
                            <p><span className="text-muted-foreground">Trades:</span> {selectedTrades.length}</p>
                            <p><span className="text-muted-foreground">Win Rate:</span> {winRate}%</p>
                            <p><span className="text-muted-foreground">Avg RR:</span> {selectedTrades.length > 0 ? (selectedTrades.reduce((acc, trade) => acc + (trade.rr || 0), 0) / selectedTrades.length).toFixed(2) : '0.00'}</p>
                            <p><span className="text-muted-foreground">Mistakes Tagged:</span> {selectedTrades.filter((trade) => (trade.notes || '').toLowerCase().includes('mistake')).length}</p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">Select a date to view daily stats.</p>
                    )}

                    <div className="rounded-md border border-border bg-secondary/20 p-2">
                        <p className="font-medium mb-1">Economic Events Overlay</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            {selectedDate && dayEvents.length === 0 && <li>No events on selected day.</li>}
                            {!selectedDate && events.length === 0 && <li>No events loaded.</li>}
                            {(selectedDate ? dayEvents : events.slice(0, 8)).map((event) => (
                                <li key={event.id}>• {event.title} {event.impact ? `(${event.impact})` : ''}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                        Insight: Track if high-impact event days reduce your execution quality or increase mistakes.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
