'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw, BrainCircuit, ShieldAlert, Target, TrendingUp, Radio, WifiOff, CircleSlash, Clock3 } from 'lucide-react'
import { toast } from 'sonner'

interface SourceDiagnostic {
    label: string
    status: 'ok' | 'blocked' | 'empty' | 'error'
}

interface MacroDeskReport {
    generatedAt: string
    sources: string[]
    sourceDiagnostics?: SourceDiagnostic[]
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

function SignalBadge({ signal }: { signal: MacroDeskReport['decisionEngine']['signal'] }) {
    const tone =
        signal === 'BUY'
            ? 'border-profit/20 bg-profit/10 text-profit'
            : signal === 'SELL'
                ? 'border-loss/20 bg-loss/10 text-loss'
                : signal === 'WAIT'
                    ? 'border-chart-4/20 bg-chart-4/10 text-chart-4'
                    : 'border-white/10 bg-white/4 text-muted-foreground'

    return <Badge className={tone}>{signal}</Badge>
}

function StatusBadge({ status }: { status: MacroDeskReport['decisionEngine']['status'] }) {
    const tone =
        status === 'ALIGNED'
            ? 'border-profit/20 bg-profit/10 text-profit'
            : status === 'CONFLICT'
                ? 'border-loss/20 bg-loss/10 text-loss'
                : 'border-white/10 bg-white/4 text-muted-foreground'

    return <Badge className={tone}>{status}</Badge>
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className="text-sm leading-6 text-muted-foreground">
                    {item}
                </li>
            ))}
        </ul>
    )
}

function SourceHealthBadge({ item }: { item: SourceDiagnostic }) {
    const content =
        item.status === 'ok'
            ? {
                icon: Radio,
                className: 'border-profit/20 bg-profit/10 text-profit',
                label: 'Live',
            }
            : item.status === 'blocked'
                ? {
                    icon: WifiOff,
                    className: 'border-loss/20 bg-loss/10 text-loss',
                    label: 'Blocked',
                }
                : item.status === 'empty'
                    ? {
                        icon: CircleSlash,
                        className: 'border-chart-4/20 bg-chart-4/10 text-chart-4',
                        label: 'Empty',
                    }
                    : {
                        icon: WifiOff,
                        className: 'border-white/10 bg-white/4 text-muted-foreground',
                        label: 'Error',
                    }

    const Icon = content.icon

    return (
        <div className={`rounded-2xl border px-3 py-2 text-xs ${content.className}`}>
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{item.label}</span>
            </div>
            <p className="mt-1 uppercase tracking-[0.16em] opacity-80">{content.label}</p>
        </div>
    )
}

function InsightCard({
    title,
    description,
    items,
}: {
    title: string
    description: string
    items: string[]
}) {
    return (
        <Card className="glass-panel interactive-panel">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <BulletList items={items} />
            </CardContent>
        </Card>
    )
}

export function TradingAnalysisPanel() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<MacroDeskReport | null>(null)
    const [score, setScore] = useState(7)
    const [tradeIntent, setTradeIntent] = useState<'buy' | 'sell' | 'none'>('none')

    const freshnessLabel = data
        ? Math.max(0, Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000))
        : null

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

    return (
        <div className="h-full flex flex-col gap-4">
            <section className="page-hero px-6 py-6 sm:px-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,160,255,0.14),transparent_24%),radial-gradient(circle_at_22%_20%,rgba(96,228,187,0.08),transparent_18%)]" />
                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-primary">
                            <BrainCircuit className="h-3.5 w-3.5" />
                            AI Macro Desk
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            Turn macro noise into one clear trading readout.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                            This panel is designed like a senior analyst brief: what matters, what conflicts, and what you should do next.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:w-[430px]">
                        <div className="stat-tile">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Checklist Input</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{score}/10</p>
                        </div>
                        <div className="stat-tile">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Intent</p>
                            <p className="mt-1 text-2xl font-semibold capitalize text-foreground">{tradeIntent}</p>
                        </div>
                        <div className="stat-tile">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sources</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{data?.sourceDiagnostics?.length || data?.sources.length || 0}</p>
                        </div>
                    </div>
                </div>
            </section>

            <Card className="glass-panel interactive-panel">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <CardTitle className="text-base">Report Controls</CardTitle>
                            <CardDescription>Adjust the setup score and intent, then refresh the analyst brief.</CardDescription>
                        </div>
                        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[112px_170px_auto]">
                            <Input
                                type="number"
                                min={0}
                                max={10}
                                value={score}
                                onChange={(e) => setScore(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                                className="h-11 rounded-xl border-white/8 bg-white/4 text-sm"
                                aria-label="Checklist score"
                            />
                            <Select value={tradeIntent} onValueChange={(value) => setTradeIntent(value as 'buy' | 'sell' | 'none')}>
                                <SelectTrigger className="h-11 rounded-xl border-white/8 bg-white/4 text-sm">
                                    <SelectValue placeholder="Trade intent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Intent</SelectItem>
                                    <SelectItem value="buy">Buy Intent</SelectItem>
                                    <SelectItem value="sell">Sell Intent</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" className="pressable h-11 gap-1.5 px-4" onClick={fetchMacroBrief} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh Brief
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {loading && !data ? (
                <Card className="glass-panel interactive-panel flex-1">
                    <CardContent className="flex h-full items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Building macro desk report...
                        </div>
                    </CardContent>
                </Card>
            ) : data ? (
                <>
                    <Card className="glass-panel interactive-panel">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <CardTitle className="text-base">Source Health</CardTitle>
                                    <CardDescription>Live visibility into which market and news feeds contributed to this report.</CardDescription>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-muted-foreground">
                                    <Clock3 className="h-3.5 w-3.5 text-primary" />
                                    {freshnessLabel === 0 ? 'Freshly generated' : `${freshnessLabel} min ago`}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {data.sourceDiagnostics && data.sourceDiagnostics.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {data.sourceDiagnostics.map((item) => (
                                        <SourceHealthBadge key={`${item.label}-${item.status}`} item={item} />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-muted-foreground">
                                    Source diagnostics were not returned for this report.
                                </div>
                            )}
                            <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-muted-foreground">
                                Active source list: <span className="text-foreground">{data.sources.join(' • ')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                        <Card className="glass-panel interactive-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    Decision Summary
                                </CardTitle>
                                <CardDescription>High-level directional read before you drill into details.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="stat-tile p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gold Bias</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{data.aiDecision.goldBias}</p>
                                </div>
                                <div className="stat-tile p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Indices Bias</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{data.aiDecision.indicesBias}</p>
                                </div>
                                <div className="stat-tile p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confidence</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{data.aiDecision.confidence}%</p>
                                </div>
                                <div className="stat-tile p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Report Time</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">{new Date(data.generatedAt).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel interactive-panel">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Target className="h-4 w-4 text-primary" />
                                    Decision Engine
                                </CardTitle>
                                <CardDescription>Whether the macro context is helping or hurting the trade idea.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <SignalBadge signal={data.decisionEngine.signal} />
                                    <StatusBadge status={data.decisionEngine.status} />
                                    <Badge variant="outline" className="border-white/10 bg-white/4">
                                        Confidence: {data.decisionEngine.confidence}
                                    </Badge>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-muted-foreground">
                                    Checklist score input: <span className="font-medium text-foreground">{data.decisionEngine.checklistScore}/10</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <InsightCard
                            title="Macro Overview"
                            description="The broad market context driving the current backdrop."
                            items={data.macroOverview}
                        />
                        <InsightCard
                            title="Market Drivers"
                            description="The most influential moving pieces right now."
                            items={data.marketDrivers}
                        />
                        <InsightCard
                            title="News + Sentiment"
                            description="How current headlines and tone are shaping price behavior."
                            items={data.newsSentiment}
                        />
                        <InsightCard
                            title="Cross-Asset: Gold"
                            description="How macro conditions are leaning for gold specifically."
                            items={data.crossAsset.gold}
                        />
                        <InsightCard
                            title="Cross-Asset: Indices"
                            description="How macro conditions are leaning for indices."
                            items={data.crossAsset.indices}
                        />
                        <InsightCard
                            title="AI Decision Logic"
                            description="Why the model is leaning in this direction."
                            items={data.aiDecision.reasoning}
                        />
                        <InsightCard
                            title="What To Do"
                            description="Practical actions supported by the current read."
                            items={data.tradeImplication.whatToDo}
                        />
                        <InsightCard
                            title="What To Avoid"
                            description="Situations likely to degrade the trade quality."
                            items={data.tradeImplication.whatToAvoid}
                        />
                        <InsightCard
                            title="Confirmation Signals"
                            description="The chart behaviors that should validate execution."
                            items={data.tradeImplication.confirmationSignals}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                        <Card className="glass-panel interactive-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldAlert className="h-4 w-4 text-primary" />
                                    Risk Factors
                                </CardTitle>
                                <CardDescription>Contextual risks that can invalidate otherwise good execution.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BulletList items={data.riskFactors} />
                            </CardContent>
                        </Card>

                        <Card className="glass-panel interactive-panel">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Advanced Edge</CardTitle>
                                <CardDescription>Regime, conflict detection, score weighting, and event awareness in one section.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Regime</p>
                                    <p className="mt-2 text-lg font-semibold capitalize text-foreground">{data.advancedEdge.marketRegime}</p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-muted-foreground">
                                    {data.advancedEdge.conflictDetection}
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                                    <p className="mb-2 text-sm font-medium text-foreground">Score Weighting</p>
                                    <BulletList items={data.advancedEdge.scoreWeighting} />
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-muted-foreground">
                                    {data.advancedEdge.eventAwareness}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : null}
        </div>
    )
}
