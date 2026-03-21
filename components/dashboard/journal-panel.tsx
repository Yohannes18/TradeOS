'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ImagePlus,
  Minus,
  NotebookPen,
  Paperclip,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { normalizeSessionValue, sessionLabel, SESSION_LABELS, SESSION_VALUES } from '@/lib/session'
import type { SessionValue, SessionValueOrUnknown } from '@/lib/session'
import { cn } from '@/lib/utils'

export interface Trade {
  id: string
  pair: string
  score: number | null
  checklist_score?: number | null
  setup_grade?: 'A' | 'B' | 'C' | null
  bias: 'bullish' | 'bearish' | 'neutral' | null
  fundamental_bias?: string | null
  session?: SessionValue | null
  entry: number | null
  sl: number | null
  tp: number | null
  rr?: number | null
  risk_amount?: number | null
  trade_date?: string | null
  mistake?: string[] | null
  emotion?: string | null
  result: 'win' | 'loss' | 'breakeven' | 'pending' | null
  notes: string | null
  created_at: string
}

interface JournalPanelProps {
  userId: string
  initialTrades: Trade[]
}

interface ChecklistLog {
  id: string
  context_score: number | null
  setup_score: number | null
  execution_score: number | null
  total_score: number | null
  data?: {
    regime?: string
    session?: string
    fundamentalAligned?: boolean
    highImpactNewsNearby?: boolean
  } | null
}

interface DailyJournalEntry {
  id: string
  journal_date: string
  note: string | null
  ai_summary: string | null
  updated_at?: string | null
}

interface TradeImage {
  id: string
  trade_id: string
  image_url: string
  created_at: string
}

interface DaySummary {
  date: string
  trades: Trade[]
  completedTrades: Trade[]
  wins: number
  losses: number
  winRate: number
  netPnl: number
  tradeCount: number
  mistakeCount: number
  averageScore: number
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTradeDate(date: string | null | undefined, createdAt: string) {
  return new Date(date || createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTradeDateKey(trade: Trade) {
  return trade.trade_date || format(new Date(trade.created_at), 'yyyy-MM-dd')
}

export function JournalPanel({ userId, initialTrades }: JournalPanelProps) {
  const [trades, setTrades] = useState(initialTrades)
  const [pairFilter, setPairFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [sessionFilter, setSessionFilter] = useState<'all' | SessionValueOrUnknown>('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [mistakeFilter, setMistakeFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistLog | null>(null)
  const [journalEntries, setJournalEntries] = useState<Record<string, DailyJournalEntry>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [tradeImages, setTradeImages] = useState<Record<string, TradeImage[]>>({})
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [isChecklistLoading, setIsChecklistLoading] = useState(false)
  const [isJournalLoading, setIsJournalLoading] = useState(false)
  const supabase = createClient()

  const getEffectiveScore = (trade: Trade) => trade.checklist_score ?? trade.score ?? 0
  const getSessionKey = (trade: Trade) => normalizeSessionValue(trade.session, trade.notes)
  const getSession = (trade: Trade) => sessionLabel(getSessionKey(trade))

  const hasMistakeTag = (trade: Trade) => {
    if (Array.isArray(trade.mistake) && trade.mistake.length > 0) return true
    return (trade.notes || '').toLowerCase().includes('mistake')
  }

  const getGrade = (score: number | null) => {
    const value = score || 0
    if (value >= 8) return 'A'
    if (value >= 6) return 'B'
    if (value >= 4) return 'C'
    return 'No Trade'
  }

  const getTradeGrade = (trade: Trade) => trade.setup_grade || getGrade(getEffectiveScore(trade))

  const getRR = (trade: Trade) => {
    if (typeof trade.rr === 'number' && !Number.isNaN(trade.rr)) {
      return `1:${trade.rr.toFixed(2)}`
    }
    if (!trade.entry || !trade.sl || !trade.tp) return '-'
    const risk = Math.abs(trade.entry - trade.sl)
    const reward = Math.abs(trade.tp - trade.entry)
    if (!risk) return '-'
    return `1:${(reward / risk).toFixed(2)}`
  }

  const pairs = useMemo(() => Array.from(new Set(trades.map((trade) => trade.pair))).sort(), [trades])
  const usesCurrencyPnl = useMemo(
    () => trades.some((trade) => typeof trade.risk_amount === 'number' && Number.isFinite(trade.risk_amount)),
    [trades],
  )

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const score = getEffectiveScore(trade)
      const session = getSessionKey(trade)
      const hasMistake = hasMistakeTag(trade)

      if (pairFilter !== 'all' && trade.pair !== pairFilter) return false
      if (resultFilter !== 'all' && trade.result !== resultFilter) return false
      if (sessionFilter !== 'all' && session !== sessionFilter) return false
      if (mistakeFilter === 'mistake' && !hasMistake) return false
      if (mistakeFilter === 'clean' && hasMistake) return false
      if (scoreFilter === 'a' && score < 8) return false
      if (scoreFilter === 'b' && (score < 6 || score >= 8)) return false
      if (scoreFilter === 'c' && (score < 4 || score >= 6)) return false
      if (scoreFilter === 'no-trade' && score >= 4) return false

      return true
    })
  }, [trades, pairFilter, resultFilter, sessionFilter, scoreFilter, mistakeFilter])

  const daySummaries = useMemo<DaySummary[]>(() => {
    const grouped = new Map<string, Trade[]>()

    for (const trade of filteredTrades) {
      const key = getTradeDateKey(trade)
      const items = grouped.get(key) || []
      items.push(trade)
      grouped.set(key, items)
    }

    return Array.from(grouped.entries())
      .map(([date, items]) => {
        const sortedItems = [...items].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
        const completedTrades = sortedItems.filter((trade) => trade.result && trade.result !== 'pending')
        const wins = completedTrades.filter((trade) => trade.result === 'win').length
        const losses = completedTrades.filter((trade) => trade.result === 'loss').length
        const netPnl = sortedItems.reduce((acc, trade) => {
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
          trades: sortedItems,
          completedTrades,
          wins,
          losses,
          winRate: completedTrades.length ? (wins / completedTrades.length) * 100 : 0,
          netPnl,
          tradeCount: sortedItems.length,
          mistakeCount: sortedItems.reduce((count, trade) => count + (hasMistakeTag(trade) ? 1 : 0), 0),
          averageScore: sortedItems.length
            ? sortedItems.reduce((acc, trade) => acc + getEffectiveScore(trade), 0) / sortedItems.length
            : 0,
        }
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [filteredTrades, usesCurrencyPnl])

  const selectedTrade =
    daySummaries.flatMap((day) => day.trades).find((trade) => trade.id === selectedTradeId) || null

  const selectedDaySummary =
    daySummaries.find((day) => day.date === selectedDay) ||
    (selectedTrade
      ? daySummaries.find((day) => day.trades.some((trade) => trade.id === selectedTrade.id)) || null
      : daySummaries[0] || null)

  const selectedDayTrades = selectedDaySummary?.trades || []
  const selectedDayEntry = selectedDaySummary ? journalEntries[selectedDaySummary.date] : null
  const selectedTradeImages = selectedTrade ? tradeImages[selectedTrade.id] || [] : []

  useEffect(() => {
    if ((!selectedDay || !daySummaries.some((day) => day.date === selectedDay)) && daySummaries[0]) {
      setSelectedDay(daySummaries[0].date)
    }

    if ((!selectedTradeId || !selectedTrade) && daySummaries[0]?.trades[0]) {
      setSelectedTradeId(daySummaries[0].trades[0].id)
    }
  }, [daySummaries, selectedDay, selectedTrade, selectedTradeId])

  useEffect(() => {
    const loadJournalSupportData = async () => {
      if (!trades.length) return

      setIsJournalLoading(true)
      const tradeIds = trades.map((trade) => trade.id)
      const dates = Array.from(
        new Set(
          trades.map((trade) => getTradeDateKey(trade)),
        ),
      ).sort()

      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]

      if (firstDate && lastDate) {
        const { data: entries, error: entryError } = await supabase
          .from('daily_journal_entries')
          .select('id, journal_date, note, ai_summary, updated_at')
          .eq('user_id', userId)
          .gte('journal_date', firstDate)
          .lte('journal_date', lastDate)

        if (!entryError && entries) {
          const nextEntries = entries.reduce<Record<string, DailyJournalEntry>>((acc, entry) => {
            acc[entry.journal_date] = entry as DailyJournalEntry
            return acc
          }, {})

          setJournalEntries(nextEntries)
          setNoteDrafts(
            entries.reduce<Record<string, string>>((acc, entry) => {
              acc[entry.journal_date] = entry.note || ''
              return acc
            }, {}),
          )
        }
      }

      const { data: images, error: imageError } = await supabase
        .from('trade_images')
        .select('id, trade_id, image_url, created_at')
        .in('trade_id', tradeIds)
        .order('created_at', { ascending: false })

      if (!imageError && images) {
        const nextImages = (images as TradeImage[]).reduce<Record<string, TradeImage[]>>((acc, image) => {
          const items = acc[image.trade_id] || []
          items.push(image)
          acc[image.trade_id] = items
          return acc
        }, {})

        setTradeImages(nextImages)
      }

      setIsJournalLoading(false)
    }

    loadJournalSupportData()
  }, [supabase, trades, userId])

  useEffect(() => {
    const loadChecklist = async () => {
      if (!selectedTrade?.id) {
        setSelectedChecklist(null)
        return
      }

      setIsChecklistLoading(true)
      const { data, error } = await supabase
        .from('checklist_logs')
        .select('id, context_score, setup_score, execution_score, total_score, data')
        .eq('user_id', userId)
        .eq('trade_id', selectedTrade.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setSelectedChecklist(null)
        setIsChecklistLoading(false)
        return
      }

      setSelectedChecklist((data as ChecklistLog | null) || null)
      setIsChecklistLoading(false)
    }

    loadChecklist()
  }, [selectedTrade?.id, supabase, userId])

  const handleResultChange = async (tradeId: string, result: 'win' | 'loss' | 'breakeven') => {
    const { error } = await supabase
      .from('trades')
      .update({ result })
      .eq('id', tradeId)
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to update result')
      return
    }

    setTrades((prev) => prev.map((trade) => (trade.id === tradeId ? { ...trade, result } : trade)))
    toast.success('Trade result updated')
  }

  const handleSaveDayNote = async (journalDate: string) => {
    const summary = daySummaries.find((day) => day.date === journalDate)
    const note = noteDrafts[journalDate] || ''

    const aiSummary = summary
      ? `${summary.tradeCount} trades, ${Math.round(summary.winRate)}% win rate, ${summary.mistakeCount} mistake-tagged trades. ${summary.netPnl >= 0 ? 'Keep reinforcing what worked.' : 'Review execution and context alignment before the next session.'}`
      : null

    const { data, error } = await supabase
      .from('daily_journal_entries')
      .upsert(
        {
          user_id: userId,
          journal_date: journalDate,
          note,
          ai_summary: aiSummary,
        },
        { onConflict: 'user_id,journal_date' },
      )
      .select('id, journal_date, note, ai_summary, updated_at')
      .single()

    if (error) {
      toast.error('Failed to save day note. Run the latest journal SQL migration if needed.')
      return
    }

    setJournalEntries((prev) => ({
      ...prev,
      [journalDate]: data as DailyJournalEntry,
    }))
    toast.success('Daily journal note saved')
  }

  const handleAddAttachment = async () => {
    if (!selectedTrade || !attachmentUrl.trim()) {
      toast.error('Add an image URL first')
      return
    }

    const { data, error } = await supabase
      .from('trade_images')
      .insert({
        trade_id: selectedTrade.id,
        image_url: attachmentUrl.trim(),
      })
      .select('id, trade_id, image_url, created_at')
      .single()

    if (error) {
      toast.error('Failed to save attachment')
      return
    }

    setTradeImages((prev) => ({
      ...prev,
      [selectedTrade.id]: [data as TradeImage, ...(prev[selectedTrade.id] || [])],
    }))
    setAttachmentUrl('')
    toast.success('Attachment saved')
  }

  const getResultBadge = (result: Trade['result']) => {
    switch (result) {
      case 'win':
        return (
          <Badge className="border-profit/20 bg-profit/10 text-profit">
            <CheckCircle className="mr-1 h-3 w-3" />
            Win
          </Badge>
        )
      case 'loss':
        return (
          <Badge className="border-loss/20 bg-loss/10 text-loss">
            <TrendingDown className="mr-1 h-3 w-3" />
            Loss
          </Badge>
        )
      case 'breakeven':
        return (
          <Badge className="bg-secondary text-muted-foreground">
            <Minus className="mr-1 h-3 w-3" />
            BE
          </Badge>
        )
      default:
        return (
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  const formatPnl = (value: number) => {
    if (usesCurrencyPnl) {
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

  const journalMetrics = useMemo(() => {
    const totalTrades = filteredTrades.length
    const completed = filteredTrades.filter((trade) => trade.result && trade.result !== 'pending')
    const wins = completed.filter((trade) => trade.result === 'win').length
    const mistakeTaggedTrades = filteredTrades.filter((trade) => hasMistakeTag(trade)).length
    const reviewedDays = daySummaries.length

    return {
      totalTrades,
      reviewedDays,
      winRate: completed.length ? Math.round((wins / completed.length) * 100) : 0,
      mistakeTaggedTrades,
    }
  }, [daySummaries, filteredTrades])

  return (
    <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
      <div className="space-y-4">
        <section className="page-hero px-6 py-6 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(119,160,255,0.14),transparent_24%),radial-gradient(circle_at_24%_18%,rgba(96,228,187,0.08),transparent_18%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Journal Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Review each day, then drill into the trade that moved the result.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              The layout is designed for faster reflection: filters, daily context, and trade-level notes all stay in one focused workspace.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Review Days</p>
              <p className="mt-2 text-2xl font-semibold">{journalMetrics.reviewedDays}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Trades</p>
              <p className="mt-2 text-2xl font-semibold">{journalMetrics.totalTrades}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Win Rate</p>
              <p className="mt-2 text-2xl font-semibold text-profit">{journalMetrics.winRate}%</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mistake Tags</p>
              <p className="mt-2 text-2xl font-semibold">{journalMetrics.mistakeTaggedTrades}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Daily Journal</CardTitle>
                <CardDescription>
                  TradeZella-style review flow: day stats, day note, and trade drill-down from one workspace.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <Select value={pairFilter} onValueChange={setPairFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pair" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pairs</SelectItem>
                  {pairs.map((pair) => (
                    <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Score" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="a">A Setups</SelectItem>
                  <SelectItem value="b">B Setups</SelectItem>
                  <SelectItem value="c">C Setups</SelectItem>
                  <SelectItem value="no-trade">No Trade</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sessionFilter} onValueChange={(value) => setSessionFilter(value as 'all' | SessionValueOrUnknown)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {SESSION_VALUES.map((session) => (
                    <SelectItem key={session} value={session}>{SESSION_LABELS[session]}</SelectItem>
                  ))}
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>

              <Select value={mistakeFilter} onValueChange={setMistakeFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Mistakes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  <SelectItem value="mistake">With Mistakes</SelectItem>
                  <SelectItem value="clean">No Mistake Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {daySummaries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-sm text-muted-foreground">
                No trades match the current filters.
              </div>
            ) : (
              daySummaries.map((day) => {
                const isSelectedDay = selectedDaySummary?.date === day.date
                const noteValue = noteDrafts[day.date] ?? journalEntries[day.date]?.note ?? ''

                return (
                  <div
                    key={day.date}
                    className={cn(
                      'rounded-2xl border p-4 transition-colors',
                      isSelectedDay ? 'border-primary bg-primary/5' : 'border-border bg-secondary/10',
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            setSelectedDay(day.date)
                            setSelectedTradeId(day.trades[0]?.id || null)
                          }}
                        >
                          <p className="text-lg font-semibold">{formatDay(day.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.tradeCount} trades, {Math.round(day.winRate)}% win rate, avg score {day.averageScore.toFixed(1)}
                          </p>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Net P&amp;L</p>
                          <p className={cn('mt-1 font-semibold', day.netPnl > 0 ? 'text-profit' : day.netPnl < 0 ? 'text-loss' : 'text-foreground')}>
                            {formatPnl(day.netPnl)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Winners</p>
                          <p className="mt-1 font-semibold">{day.wins}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Losers</p>
                          <p className="mt-1 font-semibold">{day.losses}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mistakes</p>
                          <p className="mt-1 font-semibold">{day.mistakeCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-2">
                        {day.trades.map((trade) => (
                          <button
                            key={trade.id}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day.date)
                              setSelectedTradeId(trade.id)
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors',
                              selectedTradeId === trade.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background/40 hover:bg-background/70',
                            )}
                          >
                            <div>
                              <p className="font-medium">{trade.pair}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTradeDate(trade.trade_date, trade.created_at)} • {getSession(trade)} • {getTradeGrade(trade)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getResultBadge(trade.result)}
                              <span className="text-xs text-muted-foreground">{getRR(trade)}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">Daily Note</p>
                            <p className="text-xs text-muted-foreground">Saved separately from per-trade notes.</p>
                          </div>
                          <Button size="sm" onClick={() => handleSaveDayNote(day.date)}>
                            Save Note
                          </Button>
                        </div>
                        <Textarea
                          value={noteValue}
                          onChange={(event) =>
                            setNoteDrafts((prev) => ({ ...prev, [day.date]: event.target.value }))
                          }
                          className="min-h-32 bg-background/80"
                          placeholder="What stood out today? What should repeat tomorrow? What should stop immediately?"
                        />
                        <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3 text-xs text-muted-foreground">
                          <p className="mb-1 flex items-center gap-2 font-medium text-foreground">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Daily Insight
                          </p>
                          <p>
                            {journalEntries[day.date]?.ai_summary ||
                              `${day.tradeCount} trades logged. ${day.netPnl >= 0 ? 'Positive session with room to standardize execution.' : 'Negative session. Review entries, context, and whether lower-grade setups were forced.'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4" />
            Trade Workspace
          </CardTitle>
          <CardDescription>
            Mirrors the TradeZella flow with `Stats`, `Playbook`, `Execution`, and `Attachments`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedTrade && selectedDaySummary ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{selectedTrade.pair}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(selectedDaySummary.date)} • {formatTradeDate(selectedTrade.trade_date, selectedTrade.created_at)}
                    </p>
                  </div>
                  {getResultBadge(selectedTrade.result)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{getTradeGrade(selectedTrade)} setup</Badge>
                  <Badge variant="outline">{getSession(selectedTrade)}</Badge>
                  <Badge variant="outline">{selectedTrade.fundamental_bias ?? selectedTrade.bias ?? 'No bias'}</Badge>
                  <Badge variant="outline">{getRR(selectedTrade)}</Badge>
                </div>
              </div>

              <Tabs defaultValue="stats" className="gap-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="playbook">Playbook</TabsTrigger>
                  <TabsTrigger value="execution">Execution</TabsTrigger>
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Checklist Score</p>
                      <p className="mt-2 text-xl font-semibold">{Math.round(getEffectiveScore(selectedTrade))}/10</p>
                      <Progress className="mt-2" value={getEffectiveScore(selectedTrade) * 10} />
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Risk Reward</p>
                      <p className="mt-2 text-xl font-semibold">{getRR(selectedTrade)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selectedTrade.risk_amount ? `Risked $${selectedTrade.risk_amount.toFixed(0)}` : 'Risk amount not logged'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-muted-foreground">Direction Bias</p>
                      <p className="mt-1 font-medium capitalize">{selectedTrade.fundamental_bias ?? selectedTrade.bias ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-muted-foreground">Emotion</p>
                      <p className="mt-1 font-medium capitalize">{selectedTrade.emotion || 'Not tagged'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">Trade Notes</p>
                    <p>{selectedTrade.notes || 'No trade-specific notes captured.'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="playbook" className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4" />
                      Setup Alignment
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Setup Grade</p>
                        <p className="mt-1 font-medium">{getTradeGrade(selectedTrade)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Session</p>
                        <p className="mt-1 font-medium">{getSession(selectedTrade)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Mistakes & Lessons
                    </p>
                    {Array.isArray(selectedTrade.mistake) && selectedTrade.mistake.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedTrade.mistake.map((mistake) => (
                          <Badge key={mistake} variant="outline">{mistake}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No explicit mistake tags yet.</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Day note: {selectedDayEntry?.note || 'No daily note saved for this session yet.'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="execution" className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Entry</p>
                      <p className="mt-2 font-semibold">{selectedTrade.entry ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stop</p>
                      <p className="mt-2 font-semibold">{selectedTrade.sl ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Target</p>
                      <p className="mt-2 font-semibold">{selectedTrade.tp ?? '-'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm">
                    <p className="mb-2 font-medium">Checklist Link</p>
                    {isChecklistLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-8 w-full rounded-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-8 w-full rounded-full" />
                        <Skeleton className="h-3 w-[82%]" />
                      </div>
                    ) : selectedChecklist ? (
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Context</span>
                            <span>{selectedChecklist.context_score?.toFixed(1) ?? '-'}</span>
                          </div>
                          <Progress value={(selectedChecklist.context_score || 0) * 10} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Setup</span>
                            <span>{selectedChecklist.setup_score?.toFixed(1) ?? '-'}</span>
                          </div>
                          <Progress value={(selectedChecklist.setup_score || 0) * 10} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Execution</span>
                            <span>{selectedChecklist.execution_score?.toFixed(1) ?? '-'}</span>
                          </div>
                          <Progress value={(selectedChecklist.execution_score || 0) * 10} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Regime: {selectedChecklist.data?.regime || '-'} • Fundamental aligned: {selectedChecklist.data?.fundamentalAligned ? 'Yes' : 'No'} • High-impact news nearby: {selectedChecklist.data?.highImpactNewsNearby ? 'Yes' : 'No'}
                        </p>
                      </div>
                    ) : (
                      <Empty className="rounded-2xl border-white/8 bg-white/4 p-5">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                            <NotebookPen className="h-5 w-5" />
                          </EmptyMedia>
                          <EmptyTitle className="text-base">No linked checklist yet</EmptyTitle>
                          <EmptyDescription>
                            This trade does not have a saved checklist log attached, so execution context is limited for this review.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ImagePlus className="h-4 w-4" />
                      Add Attachment
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={attachmentUrl}
                        onChange={(event) => setAttachmentUrl(event.target.value)}
                        placeholder="Paste screenshot URL"
                      />
                      <Button onClick={handleAddAttachment}>Save</Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This uses the existing `trade_images` table so screenshots stay connected to the trade.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedTradeImages.length > 0 ? (
                      selectedTradeImages.map((image) => (
                        <a
                          key={image.id}
                          href={image.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-sm hover:bg-secondary/30"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{image.image_url}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(image.created_at).toLocaleDateString()}
                          </span>
                        </a>
                      ))
                    ) : (
                      <Empty className="rounded-xl border-white/8 bg-secondary/10 p-6">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                            <ImagePlus className="h-5 w-5" />
                          </EmptyMedia>
                          <EmptyTitle className="text-base">No attachments saved</EmptyTitle>
                          <EmptyDescription>
                            Add screenshots or markups to make this trade review more useful later.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                <p className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4" />
                  AI Summary
                </p>
                <p>
                  {getEffectiveScore(selectedTrade) >= 8
                    ? 'High-quality setup. Keep documenting the exact conditions that produced this execution so it becomes repeatable.'
                    : 'This trade sits below elite quality. Compare it against your A-setups and isolate what was missing in context, patience, or execution precision.'}
                </p>
              </div>
            </div>
          ) : (
            isJournalLoading ? (
              <div className="rounded-2xl border border-white/8 bg-white/4 p-8">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-40" />
                  <div className="grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 rounded-2xl" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-24 rounded-2xl" />
                    ))}
                  </div>
                  <Skeleton className="h-44 w-full rounded-[24px]" />
                </div>
              </div>
            ) : (
              <Empty className="rounded-2xl border-white/8 bg-secondary/10 p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-white/6 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">Select a trade to open the journal workspace</EmptyTitle>
                  <EmptyDescription>
                    Choose a trade from any trading day to inspect stats, linked checklist context, attachments, and notes.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
