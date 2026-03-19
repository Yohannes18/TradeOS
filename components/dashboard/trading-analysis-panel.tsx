'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface MacroDeskReport {
    generatedAt: string
    sources: string[]
    macroOverview: string[]
    marketDrivers: string[]
    crossAsset: {
        gold: string[]
        indices: string[]
    }
    newsSentiment: string[]
    aiDecision: {
        goldBias: 'Bullish' | 'Bearish' | 'Neutral'
        indicesBias: 'Bullish' | 'Bearish' | 'Neutral'
        confidence: number
        reasoning: string[]
    }
    tradeImplication: {
        whatToDo: string[]
        whatToAvoid: string[]
        confirmationSignals: string[]
    }
    riskFactors: string[]
    decisionEngine: {
        checklistScore: number
        signal: 'BUY' | 'SELL' | 'WAIT' | 'NO TRADE'
        confidence: 'HIGH' | 'MEDIUM' | 'LOW'
        status: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL'
    }
    advancedEdge: {
        marketRegime: 'trending' | 'range' | 'volatile'
        conflictDetection: string
        scoreWeighting: string[]
        eventAwareness: string
    }
}

export function TradingAnalysisPanel() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<MacroDeskReport | null>(null)
    const [score, setScore] = useState(7)
    const [tradeIntent, setTradeIntent] = useState<'buy' | 'sell' | 'none'>('none')

    const fetchMacroBrief = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ score: String(score) })
            if (tradeIntent !== 'none') {
                params.set('trade', tradeIntent)
            }
            const response = await fetch(`/api/macro-brief?${params.toString()}`, { cache: 'no-store' })
            const payload = await response.json()

            if (!response.ok || !payload?.result) {
                throw new Error(payload?.error || 'Could not load trading analysis.')
            }

            setData(payload.result as MacroDeskReport)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load trading analysis.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMacroBrief()
    }, [])

    const renderBullets = (items: string[]) => (
        <ul className="space-y-1.5">
            {items.map((item, index) => (
                <li key={index} className="text-xs text-muted-foreground leading-snug">• {item}</li>
            ))}
        </ul>
    )

    return (
        <div className="h-full flex flex-col gap-3">
            <Card className="border-border bg-card">
                <CardHeader className="pb-2 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-sm">Macro Desk Report</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <input
                                type="number"
                                min={0}
                                max={10}
                                value={score}
                                onChange={(e) => setScore(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                                className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs"
                                aria-label="Checklist score"
                            />
                            <select
                                value={tradeIntent}
                                onChange={(e) => setTradeIntent(e.target.value as 'buy' | 'sell' | 'none')}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                                aria-label="Trade intent"
                            >
                                <option value="none">No Intent</option>
                                <option value="buy">Buy Intent</option>
                                <option value="sell">Sell Intent</option>
                            </select>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 gap-1" onClick={fetchMacroBrief} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh
                            </Button>
                        </div>
                    </div>
                    {data && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[11px]">Updated: {new Date(data.generatedAt).toLocaleString()}</Badge>
                            <Badge variant="outline" className="text-[11px]">Gold: {data.aiDecision.goldBias}</Badge>
                            <Badge variant="outline" className="text-[11px]">Indices: {data.aiDecision.indicesBias}</Badge>
                            <Badge variant="outline" className="text-[11px]">Conf: {data.aiDecision.confidence}%</Badge>
                            <Badge variant="outline" className="text-[11px]">Signal: {data.decisionEngine.signal}</Badge>
                            <Badge variant="outline" className="text-[11px]">Status: {data.decisionEngine.status}</Badge>
                            {data.sources.map((source) => (
                                <Badge key={source} variant="outline" className="text-[11px]">{source}</Badge>
                            ))}
                        </div>
                    )}
                </CardHeader>
            </Card>

            {loading && !data ? (
                <Card className="border-border bg-card flex-1">
                    <CardContent className="h-full flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Building macro desk report...
                        </div>
                    </CardContent>
                </Card>
            ) : data ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">1) Macro Overview</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.macroOverview)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">2) Market Drivers</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.marketDrivers)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">3) Cross-Asset: Gold</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.crossAsset.gold)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">3) Cross-Asset: Indices</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.crossAsset.indices)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">4) News + Sentiment</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.newsSentiment)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">5) AI Decision</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.aiDecision.reasoning)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">6) Trade Implication: Do</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.tradeImplication.whatToDo)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">6) Trade Implication: Avoid</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.tradeImplication.whatToAvoid)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">6) Confirmation Signals</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.tradeImplication.confirmationSignals)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">7) Risk Factors</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">{renderBullets(data.riskFactors)}</CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardHeader className="pb-1.5 pt-4"><CardTitle className="text-xs font-semibold tracking-wide">Advanced Edge</CardTitle></CardHeader>
                        <CardContent className="pt-0 pb-4">
                            {renderBullets([
                                `Regime: ${data.advancedEdge.marketRegime}`,
                                data.advancedEdge.conflictDetection,
                                ...data.advancedEdge.scoreWeighting,
                                data.advancedEdge.eventAwareness,
                            ])}
                        </CardContent>
                    </Card>
                </div>
            ) : null}
        </div>
    )
}
