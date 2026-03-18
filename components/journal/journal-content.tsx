'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JournalStats } from './journal-stats'

interface Trade {
  id: string
  pair: string
  score: number | null
  bias: 'bullish' | 'bearish' | 'neutral' | null
  entry: number | null
  sl: number | null
  tp: number | null
  result: 'win' | 'loss' | 'breakeven' | 'pending' | null
  notes: string | null
  created_at: string
}

interface JournalContentProps {
  userId: string
  initialTrades: Trade[]
}

export function JournalContent({ userId, initialTrades }: JournalContentProps) {
  const [trades, setTrades] = useState(initialTrades)
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  const filteredTrades = trades.filter((trade) => {
    if (filter === 'all') return true
    return trade.result === filter
  })

  const handleResultChange = async (tradeId: string, result: 'win' | 'loss' | 'breakeven') => {
    await supabase
      .from('trades')
      .update({ result })
      .eq('id', tradeId)
      .eq('user_id', userId)

    setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? { ...t, result } : t))
    )
  }

  const getBiasIcon = (bias: string | null) => {
    switch (bias) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-profit" />
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-loss" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'win':
        return (
          <Badge className="bg-profit/10 text-profit border-profit/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Win
          </Badge>
        )
      case 'loss':
        return (
          <Badge className="bg-loss/10 text-loss border-loss/20">
            <XCircle className="h-3 w-3 mr-1" />
            Loss
          </Badge>
        )
      case 'breakeven':
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Minus className="h-3 w-3 mr-1" />
            BE
          </Badge>
        )
      default:
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground'
    if (score >= 8) return 'text-profit'
    if (score >= 6) return 'text-chart-4'
    if (score >= 4) return 'text-muted-foreground'
    return 'text-loss'
  }

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="flex flex-col gap-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Trade Journal
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track, analyze, and learn from your trades
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <JournalStats trades={trades} />

        {/* Trades Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Recent Trades ({filteredTrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No trades yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Start logging trades from the dashboard to build your trading journal.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Pair</TableHead>
                      <TableHead className="text-muted-foreground">Bias</TableHead>
                      <TableHead className="text-muted-foreground">Score</TableHead>
                      <TableHead className="text-muted-foreground">Entry</TableHead>
                      <TableHead className="text-muted-foreground">SL</TableHead>
                      <TableHead className="text-muted-foreground">TP</TableHead>
                      <TableHead className="text-muted-foreground">Result</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.map((trade) => (
                      <TableRow key={trade.id} className="border-border">
                        <TableCell className="text-foreground">
                          {new Date(trade.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {trade.pair}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {getBiasIcon(trade.bias)}
                            <span className="capitalize text-sm text-muted-foreground">
                              {trade.bias || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn('font-semibold', getScoreColor(trade.score))}>
                            {trade.score ?? '-'}/10
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground font-mono text-sm">
                          {trade.entry?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className="text-loss font-mono text-sm">
                          {trade.sl?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell className="text-profit font-mono text-sm">
                          {trade.tp?.toFixed(2) ?? '-'}
                        </TableCell>
                        <TableCell>{getResultBadge(trade.result)}</TableCell>
                        <TableCell>
                          {trade.result === 'pending' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-profit hover:text-profit hover:bg-profit/10"
                                onClick={() => handleResultChange(trade.id, 'win')}
                              >
                                Win
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-loss hover:text-loss hover:bg-loss/10"
                                onClick={() => handleResultChange(trade.id, 'loss')}
                              >
                                Loss
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-muted-foreground"
                                onClick={() => handleResultChange(trade.id, 'breakeven')}
                              >
                                BE
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
