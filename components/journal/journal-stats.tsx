'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Trade {
  id: string
  result: 'win' | 'loss' | 'breakeven' | 'pending' | null
  score: number | null
}

interface JournalStatsProps {
  trades: Trade[]
}

export function JournalStats({ trades }: JournalStatsProps) {
  const completedTrades = trades.filter((t) => t.result && t.result !== 'pending')
  const wins = completedTrades.filter((t) => t.result === 'win').length
  const losses = completedTrades.filter((t) => t.result === 'loss').length
  const breakevens = completedTrades.filter((t) => t.result === 'breakeven').length
  const pending = trades.filter((t) => t.result === 'pending').length

  const winRate = completedTrades.length > 0 
    ? Math.round((wins / completedTrades.length) * 100) 
    : 0

  const avgScore = trades.filter(t => t.score !== null).length > 0
    ? Math.round(
        trades.filter(t => t.score !== null).reduce((acc, t) => acc + (t.score || 0), 0) /
        trades.filter(t => t.score !== null).length * 10
      ) / 10
    : 0

  const stats = [
    {
      label: 'Total Trades',
      value: trades.length,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: Percent,
      color: winRate >= 50 ? 'text-profit' : 'text-loss',
      bgColor: winRate >= 50 ? 'bg-profit/10' : 'bg-loss/10',
    },
    {
      label: 'Wins',
      value: wins,
      icon: TrendingUp,
      color: 'text-profit',
      bgColor: 'bg-profit/10',
    },
    {
      label: 'Losses',
      value: losses,
      icon: TrendingDown,
      color: 'text-loss',
      bgColor: 'bg-loss/10',
    },
    {
      label: 'Avg Score',
      value: avgScore,
      icon: Target,
      color: avgScore >= 6 ? 'text-profit' : 'text-muted-foreground',
      bgColor: avgScore >= 6 ? 'bg-profit/10' : 'bg-muted',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
