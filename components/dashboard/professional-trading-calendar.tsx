'use client'

import { endOfMonth, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { BarChart3, ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface TradingCalendarDayData {
  date: string
  netPnl: number
  tradeCount: number
  winRate: number
  wins?: number
  losses?: number
  breakevenCount?: number
  pendingCount?: number
}

interface ProfessionalTradingCalendarProps {
  data: TradingCalendarDayData[]
  month?: Date
  onMonthChange?: (month: Date) => void
  selectedDate?: string | null
  isLoading?: boolean
  onDateSelect?: (date: string) => void
  valueFormatter?: (value: number) => string
  className?: string
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getToneClasses(netPnl: number, tradeCount: number) {
  if (!tradeCount) {
    return 'border-border bg-secondary/30 hover:border-border/80 hover:bg-secondary/50'
  }

  if (netPnl > 0) {
    return 'border-profit/25 bg-profit/10 hover:border-profit/45 hover:bg-profit/15'
  }

  if (netPnl < 0) {
    return 'border-loss/25 bg-loss/10 hover:border-loss/45 hover:bg-loss/15'
  }

  return 'border-border bg-secondary/50 hover:border-border/80 hover:bg-secondary/70'
}

function getPnlClasses(netPnl: number, tradeCount: number) {
  if (!tradeCount) return 'text-muted-foreground'
  if (netPnl > 0) return 'text-profit'
  if (netPnl < 0) return 'text-loss'
  return 'text-foreground'
}

export function ProfessionalTradingCalendar({
  data,
  month = new Date(),
  onMonthChange,
  selectedDate,
  isLoading = false,
  onDateSelect,
  valueFormatter = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value),
  className,
}: ProfessionalTradingCalendarProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })

  const dayMap = new Map(data.map((entry) => [entry.date, entry]))
  const hasTradesThisMonth = data.some((entry) => entry.tradeCount > 0)

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base sm:text-lg">Trading Calendar</CardTitle>
            <CardDescription>
              {format(monthStart, 'MMMM yyyy')} performance mapped by day
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onMonthChange?.(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onMonthChange?.(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-profit/20 bg-profit/10 px-2.5 py-1 text-profit">
            <TrendingUp className="h-3.5 w-3.5" />
            Profit day
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-loss/20 bg-loss/10 px-2.5 py-1 text-loss">
            <TrendingDown className="h-3.5 w-3.5" />
            Loss day
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-muted-foreground">
            <Minus className="h-3.5 w-3.5" />
            No trades
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="px-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayData = dayMap.get(dateKey)
              const inMonth = isSameMonth(day, monthStart)
              const isSelected = selectedDate === dateKey
              const tradeCount = dayData?.tradeCount ?? 0
              const netPnl = dayData?.netPnl ?? 0
              const winRate = dayData?.winRate ?? 0

              const cell = (
                <button
                  type="button"
                  onClick={() => inMonth && onDateSelect?.(dateKey)}
                  className={cn(
                    'group relative min-h-28 rounded-2xl border p-2 text-left transition-colors sm:min-h-32 sm:p-3',
                    getToneClasses(netPnl, tradeCount),
                    !inMonth && 'opacity-35',
                    isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                        isToday(day) && inMonth
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/80 text-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    {tradeCount > 0 ? (
                      <div className="rounded-full border border-border/80 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {tradeCount} trade{tradeCount === 1 ? '' : 's'}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-1">
                    {tradeCount > 0 ? (
                      <>
                        <p className={cn('text-base font-semibold tracking-tight sm:text-lg', getPnlClasses(netPnl, tradeCount))}>
                          {valueFormatter(netPnl)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {tradeCount} trade{tradeCount === 1 ? '' : 's'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {Math.round(winRate)}% win rate
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground">No trades</p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Review, reset, or stay patient
                        </p>
                      </>
                    )}
                  </div>
                </button>
              )

              return dayData ? (
                <HoverCard key={dateKey} openDelay={100}>
                  <HoverCardTrigger asChild>{cell}</HoverCardTrigger>
                  <HoverCardContent align="start" className="w-72 rounded-xl border-border bg-card/95 p-4 backdrop-blur">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">{format(parseISO(dateKey), 'EEEE, MMMM d')}</p>
                        <p className="text-xs text-muted-foreground">Full daily performance snapshot</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Net P&L</p>
                          <p className={cn('mt-1 font-semibold', getPnlClasses(dayData.netPnl, dayData.tradeCount))}>
                            {valueFormatter(dayData.netPnl)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Win Rate</p>
                          <p className="mt-1 font-semibold text-foreground">{Math.round(dayData.winRate)}%</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trades</p>
                          <p className="mt-1 font-semibold text-foreground">{dayData.tradeCount}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Wins / Losses</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {dayData.wins ?? 0} / {dayData.losses ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-2 py-1">
                          Breakeven: {dayData.breakevenCount ?? 0}
                        </span>
                        <span className="rounded-full border border-border px-2 py-1">
                          Pending: {dayData.pendingCount ?? 0}
                        </span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <div key={dateKey}>{cell}</div>
              )
            })}
          </div>
        )}

        {!isLoading && !hasTradesThisMonth ? (
          <Empty className="border-border bg-secondary/20 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>No trades in this month yet</EmptyTitle>
              <EmptyDescription>
                Logged sessions will appear here with daily P&amp;L, trade count, and win rate.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </CardContent>
    </Card>
  )
}
