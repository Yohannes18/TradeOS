'use client'

import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfessionalTradingCalendar, type TradingCalendarDayData } from '@/components/dashboard/professional-trading-calendar'
import { CalendarDays, Sparkles } from 'lucide-react'

interface TradeRow {
  id: string
  pair: string
  trade_date?: string | null
  created_at: string
  result: 'win' | 'loss' | 'breakeven' | 'pending' | null
  notes: string | null
  rr?: number | null
  risk_amount?: number | null
  mistake?: string[] | null
}

interface EconomicEvent {
  id: string
  title: string
  impact: string | null
  event_date: string | null
}

export default function CalendarPage() {
  const supabase = createClient()
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()))
  const [calendarData, setCalendarData] = useState<TradingCalendarDayData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTrades, setSelectedTrades] = useState<TradeRow[]>([])
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [isMonthLoading, setIsMonthLoading] = useState(true)
  const [isDayLoading, setIsDayLoading] = useState(false)
  const [pnlMode, setPnlMode] = useState<'currency' | 'rr'>('rr')

  useEffect(() => {
    const loadMonth = async () => {
      setIsMonthLoading(true)

      const monthStart = format(startOfMonth(displayMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(displayMonth), 'yyyy-MM-dd')

      const { data: trades } = await supabase
        .from('trades')
        .select('id, pair, trade_date, created_at, result, notes, rr, risk_amount, mistake')
        .gte('trade_date', monthStart)
        .lte('trade_date', monthEnd)
        .order('trade_date', { ascending: true })
        .order('created_at', { ascending: true })

      const rows = (trades as TradeRow[] | null) || []
      const usesCurrencyPnl = rows.some((trade) => typeof trade.risk_amount === 'number' && Number.isFinite(trade.risk_amount))
      setPnlMode(usesCurrencyPnl ? 'currency' : 'rr')

      const grouped = new Map<string, TradeRow[]>()
      for (const trade of rows) {
        const key = trade.trade_date || format(new Date(trade.created_at), 'yyyy-MM-dd')
        const existing = grouped.get(key) || []
        existing.push(trade)
        grouped.set(key, existing)
      }

      const nextCalendarData = Array.from(grouped.entries()).map(([date, items]) => {
        const completed = items.filter((trade) => trade.result && trade.result !== 'pending')
        const wins = completed.filter((trade) => trade.result === 'win').length
        const losses = completed.filter((trade) => trade.result === 'loss').length
        const breakevenCount = completed.filter((trade) => trade.result === 'breakeven').length
        const pendingCount = items.filter((trade) => trade.result === 'pending').length
        const winRate = completed.length ? (wins / completed.length) * 100 : 0

        const netPnl = items.reduce((acc, trade) => {
          const rr = trade.rr ?? 0
          const riskAmount = trade.risk_amount ?? 0

          if (usesCurrencyPnl) {
            if (trade.result === 'win') return acc + riskAmount * rr
            if (trade.result === 'loss') return acc - riskAmount
            return acc
          }

          if (trade.result === 'win') return acc + rr
          if (trade.result === 'loss') return acc - 1
          return acc
        }, 0)

        return {
          date,
          netPnl,
          tradeCount: items.length,
          winRate,
          wins,
          losses,
          breakevenCount,
          pendingCount,
        }
      })

      const { data: eventRows } = await supabase
        .from('economic_events')
        .select('id, title, impact, event_date')
        .gte('event_date', monthStart)
        .lte('event_date', monthEnd)
        .order('event_date', { ascending: true })
        .limit(200)

      setCalendarData(nextCalendarData)
      setEvents((eventRows as EconomicEvent[] | null) || [])
      setIsMonthLoading(false)

      setSelectedDate((current) => {
        if (current && !nextCalendarData.some((day) => day.date === current)) {
          setSelectedTrades([])
          return null
        }

        return current
      })
    }

    loadMonth()
  }, [displayMonth, supabase])

  useEffect(() => {
    const loadTradesByDay = async () => {
      if (!selectedDate) {
        setSelectedTrades([])
        return
      }

      setIsDayLoading(true)
      const { data } = await supabase
        .rpc('get_trades_by_date', { p_trade_date: selectedDate })

      setSelectedTrades((data as TradeRow[] | null) || [])
      setIsDayLoading(false)
    }

    loadTradesByDay()
  }, [selectedDate, supabase])

  const selectedDay = useMemo(
    () => (selectedDate ? calendarData.find((day) => day.date === selectedDate) || null : null),
    [calendarData, selectedDate],
  )

  const dayEvents = useMemo(
    () => (selectedDate ? events.filter((event) => event.event_date === selectedDate) : []),
    [events, selectedDate],
  )

  const selectedMistakes = selectedTrades.reduce((count, trade) => {
    if (trade.mistake?.length) return count + trade.mistake.length
    if ((trade.notes || '').toLowerCase().includes('mistake')) return count + 1
    return count
  }, 0)

  const selectedCompleted = selectedTrades.filter((trade) => trade.result && trade.result !== 'pending')
  const avgRr = selectedTrades.length
    ? (selectedTrades.reduce((acc, trade) => acc + (trade.rr || 0), 0) / selectedTrades.length).toFixed(2)
    : '0.00'

  const formatPnl = (value: number) => {
    if (pnlMode === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }

    const fixed = value.toFixed(1)
    return `${value > 0 ? '+' : ''}${fixed}R`
  }

  return (
    <div className="page-wrap grid grid-cols-1 overflow-auto xl:grid-cols-3">
      <ProfessionalTradingCalendar
        className="xl:col-span-2"
        data={calendarData}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        selectedDate={selectedDate}
        isLoading={isMonthLoading}
        onDateSelect={setSelectedDate}
        valueFormatter={formatPnl}
      />

      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Day Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {selectedDate ? (
            isDayLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
                <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-[85%]" />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                  <p><span className="text-muted-foreground">Date:</span> {selectedDate}</p>
                  <p><span className="text-muted-foreground">Trades:</span> {selectedTrades.length}</p>
                  <p><span className="text-muted-foreground">Net P&amp;L:</span> {formatPnl(selectedDay?.netPnl || 0)}</p>
                  <p><span className="text-muted-foreground">Win Rate:</span> {Math.round(selectedDay?.winRate || 0)}%</p>
                  <p><span className="text-muted-foreground">Winners / Losers:</span> {(selectedDay?.wins || 0)} / {(selectedDay?.losses || 0)}</p>
                  <p><span className="text-muted-foreground">Avg RR:</span> {avgRr}</p>
                  <p><span className="text-muted-foreground">Mistakes Tagged:</span> {selectedMistakes}</p>
                  <p><span className="text-muted-foreground">Completed Trades:</span> {selectedCompleted.length}</p>
                </div>

                {selectedTrades.length === 0 && (
                  <Empty className="rounded-2xl border-white/8 bg-white/4 p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </EmptyMedia>
                      <EmptyTitle className="text-base">No trades logged for this day</EmptyTitle>
                      <EmptyDescription>
                        This date is selected, but there are no linked trade rows to review in the detail workspace.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </>
            )
          ) : (
            <Empty className="rounded-2xl border-white/8 bg-white/4 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                  <Sparkles className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle className="text-base">Select a day to inspect the session</EmptyTitle>
                <EmptyDescription>
                  Daily stats, trade counts, mistakes, and event overlays will appear here once you choose a calendar cell.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
            <p className="mb-2 font-medium">Economic Events Overlay</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {selectedDate && dayEvents.length === 0 && <li>No events on selected day.</li>}
              {!selectedDate && events.length === 0 && <li>No events loaded for this month.</li>}
              {(selectedDate ? dayEvents : events.slice(0, 8)).map((event) => (
                <li key={event.id}>• {event.title} {event.impact ? `(${event.impact})` : ''}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            Insight: This view now loads only the visible month from Supabase and fetches trade details for the selected day on demand.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
