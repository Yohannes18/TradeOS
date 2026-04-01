'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Users, TrendingUp, Star, Medal, Crown, Target, BarChart3, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaderboardEntry {
    rank: number
    isCurrentUser: boolean
    handle: string
    winRate: number
    profitFactor: number
    avgRR: number
    trades: number
    topGrade: string
}

interface CommunityHubProps {
    leaderboard: LeaderboardEntry[]
    currentUserId: string
}

const PLAYBOOKS = [
    {
        id: 1,
        title: 'London Open Liquidity Sweep',
        pair: 'XAUUSD',
        bias: 'LONG',
        winRate: 72,
        trades: 28,
        grade: 'A+',
        description: 'Wait for Asian range liquidity sweep at London open, then fade the sweep into a discount zone. Requires structure break + imbalance.',
        tags: ['ICT', 'London Open', 'Liquidity'],
        author: 'Trader#007',
    },
    {
        id: 2,
        title: 'NY Session DXY Correlation',
        pair: 'EURUSD',
        bias: 'SHORT',
        winRate: 68,
        trades: 42,
        grade: 'A+',
        description: 'Short EURUSD when DXY breaks above the NY open high. Wait for 15m close above structure, entry on retest with 1.5R minimum.',
        tags: ['NY Session', 'DXY Correlation', 'Structure'],
        author: 'Trader#012',
    },
    {
        id: 3,
        title: 'Gold CPI Fade Setup',
        pair: 'XAUUSD',
        bias: 'SHORT',
        winRate: 65,
        trades: 18,
        grade: 'A',
        description: 'Fade the first CPI spike on gold if price is extended beyond 2 ATR. Wait 15 min for initial impulse to exhaust.',
        tags: ['News Trade', 'CPI', 'Fade'],
        author: 'Trader#019',
    },
    {
        id: 4,
        title: 'Session High/Low Breakout',
        pair: 'GBPUSD',
        bias: 'NEUTRAL',
        winRate: 61,
        trades: 34,
        grade: 'A',
        description: 'Trade breakouts from key session highs and lows with volume confirmation. Enter on 4H close with ATR-based stops.',
        tags: ['Breakout', 'Session', 'Volume'],
        author: 'Trader#023',
    },
]

const TIPS = [
    { icon: Flame, text: 'Win streaks don\'t predict future results. Stay process-focused.', color: 'text-orange-400' },
    { icon: Target, text: 'A 1:2 RR with 50% win rate outperforms 1:1 RR at 70% win rate.', color: 'text-emerald-400' },
    { icon: BarChart3, text: 'Track your best performing sessions — consistency beats volume.', color: 'text-blue-400' },
    { icon: Star, text: 'Traders who journal daily improve win rate by avg 15% in 90 days.', color: 'text-yellow-400' },
]

function RankIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-400" />
    if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" />
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />
    return <span className="text-xs font-semibold text-muted-foreground">#{rank}</span>
}

export function CommunityHub({ leaderboard, currentUserId }: CommunityHubProps) {
    const [tab, setTab] = useState('leaderboard')

    const displayBoard = leaderboard.length > 0 ? leaderboard : [
        { rank: 1, isCurrentUser: false, handle: 'Trader#001', winRate: 78, profitFactor: 2.4, avgRR: 2.8, trades: 64, topGrade: 'A+' },
        { rank: 2, isCurrentUser: false, handle: 'Trader#002', winRate: 73, profitFactor: 2.1, avgRR: 2.5, trades: 51, topGrade: 'A+' },
        { rank: 3, isCurrentUser: false, handle: 'Trader#003', winRate: 71, profitFactor: 1.9, avgRR: 2.2, trades: 88, topGrade: 'A' },
        { rank: 4, isCurrentUser: true, handle: 'You', winRate: 65, profitFactor: 1.7, avgRR: 2.0, trades: 22, topGrade: 'A' },
        { rank: 5, isCurrentUser: false, handle: 'Trader#005', winRate: 62, profitFactor: 1.6, avgRR: 1.9, trades: 37, topGrade: 'B' },
    ]

    return (
        <div className="page-wrap overflow-auto pb-20">
            <header className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Community</p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Trader Network</h1>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{Math.max(displayBoard.length, 12)} active traders</span>
                    </div>
                </div>
            </header>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-11 w-full justify-start gap-1 rounded-xl bg-white/5 p-1 sm:w-auto">
                    <TabsTrigger value="leaderboard" className="gap-2">
                        <Trophy className="h-4 w-4" /> Leaderboard
                    </TabsTrigger>
                    <TabsTrigger value="playbooks" className="gap-2">
                        <Star className="h-4 w-4" /> Playbooks
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="gap-2">
                        <TrendingUp className="h-4 w-4" /> Insights
                    </TabsTrigger>
                </TabsList>

                {/* Leaderboard */}
                <TabsContent value="leaderboard" className="mt-0 space-y-3">
                    <div className="rounded-xl border border-white/8 bg-white/3">
                        <div className="hidden grid-cols-[44px_1fr_80px_80px_80px_64px_64px] items-center gap-3 border-b border-white/8 px-4 py-3 sm:grid">
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rank</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trader</span>
                            <span className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">Win %</span>
                            <span className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">PF</span>
                            <span className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">Avg RR</span>
                            <span className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">Trades</span>
                            <span className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">Grade</span>
                        </div>
                        {displayBoard.map((entry) => (
                            <div
                                key={entry.rank}
                                className={cn(
                                    'grid grid-cols-[44px_1fr] gap-3 px-4 py-4 sm:grid-cols-[44px_1fr_80px_80px_80px_64px_64px] sm:items-center',
                                    'border-b border-white/6 last:border-0 transition-colors duration-150 hover:bg-white/3',
                                    entry.isCurrentUser && 'bg-primary/6 ring-1 ring-inset ring-primary/20'
                                )}
                            >
                                <div className="flex items-center justify-center">
                                    <RankIcon rank={entry.rank} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold">
                                        {entry.handle}
                                        {entry.isCurrentUser && (
                                            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">You</span>
                                        )}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2 sm:hidden">
                                        <span className="text-xs text-muted-foreground">Win: <b className="text-foreground">{entry.winRate}%</b></span>
                                        <span className="text-xs text-muted-foreground">RR: <b className="text-foreground">{entry.avgRR}</b></span>
                                        <span className="text-xs text-muted-foreground">Trades: <b className="text-foreground">{entry.trades}</b></span>
                                    </div>
                                </div>
                                <div className="hidden text-center sm:block">
                                    <span className={cn('text-sm font-semibold', entry.winRate >= 60 ? 'text-profit' : entry.winRate >= 50 ? 'text-foreground' : 'text-loss')}>
                                        {entry.winRate}%
                                    </span>
                                </div>
                                <div className="hidden text-center sm:block">
                                    <span className="text-sm font-semibold">{entry.profitFactor}</span>
                                </div>
                                <div className="hidden text-center sm:block">
                                    <span className="text-sm font-semibold">{entry.avgRR}</span>
                                </div>
                                <div className="hidden text-center sm:block">
                                    <span className="text-sm text-muted-foreground">{entry.trades}</span>
                                </div>
                                <div className="hidden text-center sm:block">
                                    <Badge variant="outline" className="text-xs">{entry.topGrade}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="px-1 text-xs text-muted-foreground">All data is anonymized. Rankings update daily. Minimum 3 completed trades to appear.</p>
                </TabsContent>

                {/* Playbooks */}
                <TabsContent value="playbooks" className="mt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                        {PLAYBOOKS.map((pb) => (
                            <Card key={pb.id} className="glass-panel interactive-panel">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base leading-snug">{pb.title}</CardTitle>
                                        <Badge variant="outline" className={cn('shrink-0 text-xs', pb.bias === 'LONG' ? 'border-profit/40 text-profit' : pb.bias === 'SHORT' ? 'border-loss/40 text-loss' : '')}>
                                            {pb.bias}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{pb.pair}</span>
                                        <span>·</span>
                                        <span>{pb.author}</span>
                                        <span>·</span>
                                        <span>{pb.trades} trades</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm leading-6 text-muted-foreground">{pb.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {pb.tags.map((tag) => (
                                            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 border-t border-white/8 pt-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Win Rate</p>
                                            <p className="text-sm font-semibold text-profit">{pb.winRate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Grade</p>
                                            <p className="text-sm font-semibold">{pb.grade}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Insights */}
                <TabsContent value="insights" className="mt-0 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {TIPS.map((tip, i) => (
                            <div key={i} className="glass-panel interactive-panel flex items-start gap-4 rounded-2xl p-5">
                                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                    <tip.icon className={cn('h-5 w-5', tip.color)} />
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">{tip.text}</p>
                            </div>
                        ))}
                    </div>
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle className="text-base">Platform Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {[
                                    { label: 'Avg Win Rate', value: '63%' },
                                    { label: 'Avg RR', value: '2.1' },
                                    { label: 'Most Traded', value: 'XAUUSD' },
                                    { label: 'Best Session', value: 'London' },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-xl border border-white/8 bg-white/4 p-3 text-center">
                                        <p className="text-lg font-semibold">{stat.value}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
