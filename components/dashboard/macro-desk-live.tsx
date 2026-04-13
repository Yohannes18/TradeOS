'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketTile {
    symbol: string
    label: string
    price: string
    change: string
    changePct: string
    direction: 'up' | 'down' | 'flat'
    bias: string
    category: 'fx' | 'metal' | 'index' | 'bond' | 'energy'
    tvSymbol: string
}

interface MacroBriefReport {
    generatedAt: string
    macroOverview: string[]
    marketDrivers: string[]
    newsSentiment: string[]
    riskFactors: string[]
    tradeImplication: {
        whatToDo: string[]
        whatToAvoid: string[]
        confirmationSignals: string[]
    }
    decisionEngine: {
        signal: 'BUY' | 'SELL' | 'WAIT' | 'NO TRADE'
        confidence: 'HIGH' | 'MEDIUM' | 'LOW'
        status: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL'
    }
    aiDecision: {
        goldBias: string
        indicesBias: string
        confidence: number
        reasoning: string[]
    }
    marketData: {
        dxy: { value: number; trend: string }
        economic_events: string[]
        news: string[]
    }
}

const CATEGORY_COLORS: Record<MarketTile['category'], string> = {
    fx: 'border-blue-500/30 text-blue-400',
    metal: 'border-yellow-500/30 text-yellow-400',
    index: 'border-emerald-500/30 text-emerald-400',
    bond: 'border-purple-500/30 text-purple-400',
    energy: 'border-orange-500/30 text-orange-400',
}

function DirectionIcon({ direction }: { direction: MarketTile['direction'] }) {
    if (direction === 'up') return <TrendingUp className="h-4 w-4 text-profit" />
    if (direction === 'down') return <TrendingDown className="h-4 w-4 text-loss" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
}

export function MacroDeskLive() {
    const [tiles, setTiles] = useState<MarketTile[]>([])
    const [macroBrief, setMacroBrief] = useState<MacroBriefReport | null>(null)
    const [loading, setLoading] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [online, setOnline] = useState(true)
    const [selectedTile, setSelectedTile] = useState<MarketTile | null>(null)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [liveRes, briefRes] = await Promise.all([
                fetch('/api/macro-live', { signal: AbortSignal.timeout(5000) }),
                fetch('/api/macro-brief?score=8', { signal: AbortSignal.timeout(10000), cache: 'no-store' }),
            ])

            if (!liveRes.ok) {
                const payload = await liveRes.json().catch(() => null)
                throw new Error(payload?.error || 'Live market feed unavailable.')
            }

            const liveData = await liveRes.json()
            if (Array.isArray(liveData) && liveData.length > 0) {
                setTiles(liveData)
            } else {
                throw new Error('Live market feed returned no instruments.')
            }

            if (briefRes.ok) {
                const payload = await briefRes.json()
                if (payload?.result) setMacroBrief(payload.result)
            }

            setOnline(true)
        } catch (refreshError) {
            setOnline(false)
            setError(refreshError instanceof Error ? refreshError.message : 'Live market feed unavailable.')
        } finally {
            setLoading(false)
            setLastUpdated(new Date())
        }
    }, [])

    useEffect(() => {
        refresh()
        const interval = setInterval(refresh, 60_000)
        return () => clearInterval(interval)
    }, [refresh])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                    {online ? (
                        <><Wifi className="h-4 w-4 text-profit" /><span className="text-muted-foreground">Live macro and market feed</span></>
                    ) : (
                        <><WifiOff className="h-4 w-4 text-loss" /><span className="text-muted-foreground">Live feed unavailable</span></>
                    )}
                    <span className="text-muted-foreground">· Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2 border-white/10 bg-white/5">
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-xl border border-loss/20 bg-loss/8 px-4 py-3 text-sm text-loss">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tiles.filter((tile) => tile.symbol !== 'SENTIMENT').map((tile) => (
                    <button
                        key={tile.symbol}
                        onClick={() => setSelectedTile(selectedTile?.symbol === tile.symbol ? null : tile)}
                        className={cn(
                            'glass-panel interactive-panel rounded-2xl p-4 text-left transition-all',
                            selectedTile?.symbol === tile.symbol && 'ring-1 ring-primary/40'
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <Badge variant="outline" className={cn('mb-2 text-xs', CATEGORY_COLORS[tile.category])}>
                                    {tile.category.toUpperCase()}
                                </Badge>
                                <p className="text-xs text-muted-foreground">{tile.label}</p>
                                <p className="mt-1 text-2xl font-semibold tracking-tight">{tile.price}</p>
                            </div>
                            <DirectionIcon direction={tile.direction} />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={cn('text-sm font-medium', tile.direction === 'up' ? 'text-profit' : tile.direction === 'down' ? 'text-loss' : 'text-muted-foreground')}>
                                {tile.change} ({tile.changePct})
                            </span>
                        </div>
                        {selectedTile?.symbol === tile.symbol ? (
                            <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3">
                                <div className="mb-1 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-medium text-primary">Bias</span>
                                </div>
                                <p className="text-xs leading-5 text-muted-foreground">{tile.bias}</p>
                                {tile.tvSymbol ? (
                                    <a
                                        href={`https://www.tradingview.com/chart/?symbol=${tile.tvSymbol}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        Open in TradingView →
                                    </a>
                                ) : null}
                            </div>
                        ) : null}
                    </button>
                ))}
            </div>

            {macroBrief ? (
                <>
                    <div className="grid gap-4 xl:grid-cols-3">
                        <Card className="glass-panel xl:col-span-2">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">AI Daily Report</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-3">
                                <ReportPanel title="What happened today" items={macroBrief.macroOverview.slice(0, 3)} />
                                <ReportPanel title="Why market moved" items={macroBrief.marketDrivers.slice(0, 3)} />
                                <ReportPanel title="What to expect next" items={macroBrief.tradeImplication.whatToDo.slice(0, 3)} />
                            </CardContent>
                        </Card>

                        <Card className="glass-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Macro Alerts & Bias</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <MetricCard label="Decision Engine" value={`${macroBrief.decisionEngine.signal} · ${macroBrief.decisionEngine.status}`} />
                                <MetricCard label="AI Bias" value={`Gold ${macroBrief.aiDecision.goldBias} / Indices ${macroBrief.aiDecision.indicesBias}`} />
                                <MetricCard label="DXY" value={`${macroBrief.marketData.dxy.value.toFixed(2)} · ${macroBrief.marketData.dxy.trend}`} />
                                <MetricCard label="Next Alert" value={macroBrief.marketData.economic_events[0] || macroBrief.riskFactors[0] || 'No major alert'} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                        <Card className="glass-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Confirmation Signals</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
                                {macroBrief.tradeImplication.confirmationSignals.slice(0, 4).map((item) => (
                                    <p key={item}>{item}</p>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">What to Avoid</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
                                {macroBrief.tradeImplication.whatToAvoid.slice(0, 4).map((item) => (
                                    <p key={item}>{item}</p>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Market News Pulse</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
                                {macroBrief.marketData.news.slice(0, 4).map((item) => (
                                    <p key={item}>{item}</p>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : null}

            {tiles.find((tile) => tile.symbol === 'SENTIMENT') ? (
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Market Sentiment Index</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-3xl font-semibold text-profit">Risk-On</p>
                                <p className="mt-1 text-sm text-muted-foreground">Greed zone — equities leading, vol compressed</p>
                            </div>
                            <div className="flex-1">
                                <div className="relative h-3 overflow-hidden rounded-full bg-white/8">
                                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-loss via-yellow-500 to-profit" style={{ width: '61%' }} />
                                    <div className="absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg" style={{ left: '61%' }} />
                                </div>
                                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                    <span>Fear</span><span>Neutral</span><span>Greed</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    )
}

function ReportPanel({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{title}</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {items.map((item) => (
                    <p key={item}>{item}</p>
                ))}
            </div>
        </div>
    )
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
        </div>
    )
}
