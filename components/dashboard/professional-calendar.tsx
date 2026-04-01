'use client'

import { useMemo, useState } from 'react'
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface ProfessionalCalendarDay {
    date: string
    netPnl: number
    trades: number
    rMultiple: number
    winRate: number
    topSetup?: string
    recommendation?: 'CONFIRM' | 'WAIT' | 'INVALID'
}

interface ProfessionalCalendarProps {
    month: Date
    data: ProfessionalCalendarDay[]
    selectedDate?: string | null
    onMonthChange: (date: Date) => void
    onDateSelect: (date: string) => void
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ProfessionalCalendar({ month, data, selectedDate, onDateSelect, onMonthChange }: ProfessionalCalendarProps) {
    const [showPnl, setShowPnl] = useState(true)
    const [showTrades, setShowTrades] = useState(true)
    const [showRr, setShowRr] = useState(true)
    const [showWinRate, setShowWinRate] = useState(true)

    const dayMap = useMemo(() => new Map(data.map((day) => [day.date, day])), [data])
    const monthDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
    })

    const monthlyStats = data.reduce(
        (acc, day) => {
            acc.net += day.netPnl
            acc.trades += day.trades
            acc.r += day.rMultiple
            return acc
        },
        { net: 0, trades: 0, r: 0 },
    )

    const tone = (netPnl: number, trades: number) => {
        if (!trades) return 'bg-slate-800/70 border-white/10'
        if (netPnl > 0) return 'bg-green-900/50 border-green-700/40'
        if (netPnl < 0) return 'bg-red-900/50 border-red-700/40'
        return 'bg-slate-800 border-white/10'
    }

    return (
        <Card className="glass-panel">
            <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg">Professional Calendar</CardTitle>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => onMonthChange(subMonths(month, 1))} aria-label="Previous month">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>Today</Button>
                        <input
                            type="month"
                            value={format(month, 'yyyy-MM')}
                            onChange={(event) => onMonthChange(new Date(`${event.target.value}-01T00:00:00`))}
                            className="h-8 rounded-md border border-white/10 bg-card px-2 text-xs"
                            aria-label="Month picker"
                        />
                        <Button variant="ghost" size="icon-sm" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon-sm" aria-label="Calendar settings">
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 border-white/10 bg-card/95">
                                <div className="space-y-3 text-sm">
                                    <ToggleRow label="Net P/L" checked={showPnl} onCheckedChange={setShowPnl} />
                                    <ToggleRow label="Trades" checked={showTrades} onCheckedChange={setShowTrades} />
                                    <ToggleRow label="R-Multiple" checked={showRr} onCheckedChange={setShowRr} />
                                    <ToggleRow label="Win %" checked={showWinRate} onCheckedChange={setShowWinRate} />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs sm:grid-cols-4">
                    <Summary label="Month" value={format(month, 'MMMM yyyy')} />
                    <Summary label="Net P/L" value={`${monthlyStats.net >= 0 ? '+' : ''}${monthlyStats.net.toFixed(1)}R`} />
                    <Summary label="Trades" value={String(monthlyStats.trades)} />
                    <Summary label="R-Multiple" value={monthlyStats.r.toFixed(1)} />
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="grid grid-cols-7 gap-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {WEEK_DAYS.map((day) => (
                        <span key={day}>{day}</span>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-3">
                    {monthDays.map((day) => {
                        const key = format(day, 'yyyy-MM-dd')
                        const row = dayMap.get(key)
                        const active = selectedDate === key
                        const inMonth = isSameMonth(day, month)

                        const cell = (
                            <button
                                type="button"
                                onClick={() => inMonth && onDateSelect(key)}
                                className={cn(
                                    'min-h-28 rounded-xl border p-2 text-left transition duration-300 sm:min-h-32',
                                    'min-w-0',
                                    tone(row?.netPnl ?? 0, row?.trades ?? 0),
                                    !inMonth && 'opacity-30',
                                    active && 'ring-2 ring-primary',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs', isToday(day) ? 'bg-primary text-primary-foreground' : 'bg-black/20')}>
                                        {format(day, 'd')}
                                    </span>
                                    {row?.recommendation ? (
                                        <span className="text-[10px] text-muted-foreground">{row.recommendation}</span>
                                    ) : null}
                                </div>

                                <div className="mt-2 space-y-0.5 text-[11px] text-slate-100">
                                    {showPnl && <p>Net: {row ? `${row.netPnl >= 0 ? '+' : ''}${row.netPnl.toFixed(1)}R` : '--'}</p>}
                                    {showTrades && <p>Trades: {row?.trades ?? 0}</p>}
                                    {showRr && <p>R: {row?.rMultiple?.toFixed(1) ?? '0.0'}</p>}
                                    {showWinRate && <p>Win: {Math.round(row?.winRate ?? 0)}%</p>}
                                </div>
                            </button>
                        )

                        if (!row) return <div key={key}>{cell}</div>

                        return (
                            <Tooltip key={key}>
                                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                                <TooltipContent side="right" className="max-w-64 border border-white/10 bg-card p-3 text-xs">
                                    <p className="font-medium text-foreground">{format(day, 'EEE, MMM d')}</p>
                                    <p className="text-muted-foreground">Net: {row.netPnl.toFixed(1)}R · Trades: {row.trades}</p>
                                    <p className="text-muted-foreground">Win: {Math.round(row.winRate)}% · Top Setup: {row.topSetup || 'N/A'}</p>
                                    <p className="text-muted-foreground">Checklist Grade: {row.netPnl > 0 ? 'A+' : 'F'} · AI: {row.recommendation || 'WAIT'}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
    )
}

function ToggleRow({
    label,
    checked,
    onCheckedChange,
}: {
    label: string
    checked: boolean
    onCheckedChange: (value: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/4 px-3 py-2">
            <label className="text-muted-foreground">{label}</label>
            <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} aria-label={label} />
        </div>
    )
}
