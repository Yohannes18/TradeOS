'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProfessionalChecklist } from '@/components/dashboard/professional-checklist'
import { RiskCalculator } from '@/components/dashboard/risk-calculator'
import { AIAnalysisPanel } from '@/components/dashboard/ai-analysis-panel'
import type { ChecklistResult, TradeSetupForm } from '@/lib/trading/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, CandlestickChart, ShieldCheck, AlertTriangle, History } from 'lucide-react'

const DEFAULT_CHECKLIST: ChecklistResult = {
    status: 'STANDBY',
    grade: 'STANDBY',
    reason: 'Waiting for checklist inputs.',
    quarter: 'Q1',
    phase_valid: false,
    context_valid: false,
    target_valid: false,
    score: 0,
    checks: { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Q5: 0, Q6: 0 },
}

const DEFAULT_FORM: TradeSetupForm = {
    htfBias: { weekly: 'Uptrend', daily: 'Uptrend', h4: 'Uptrend' },
    ltfBias: { h1: 'Uptrend', m30: 'Uptrend', m15: 'Uptrend', m5: 'Uptrend' },
    supportResistanceAligned: 'Yes',
    supplyDemand: {
        htfPresent: 'Yes',
        ltfPresent: 'Yes',
        ltfCorrectionIntoHtfZone: 'Yes',
        confluenceStrong: 'Yes',
    },
    liquidity: { sweepOnLtf: 'Yes', liquidityNearSl: 'Yes', type: 'Equal Lows' },
    bonusConfluence: { crtOccurred: 'No', crtTimeframe: '4H', pattern: 'None' },
    traderIntent: { directionThought: 'With Trend', psychology: 'Focused', environment: 'Clean / Quiet' },
    execution: { tpSet: 'Yes', slSet: 'Yes' },
    dxy: { trend: 'Neutral', aligned: 'Yes' },
}

interface TradeWorkspaceProps {
    userId: string
    accountBalance: number
    riskPercent: number
    defaultPair?: string
    historicalTrades?: Array<{
        id: string
        pair: string
        result?: string | null
        setup_grade?: string | null
        trade_date?: string | null
        created_at?: string | null
        notes?: string | null
        checklist_json?: Partial<ChecklistResult> | null
    }>
}

const STATUS_CONFIG = {
    AUTHORIZED: { color: 'border-profit/40 bg-profit/10 text-profit', icon: CheckCircle, label: 'AUTHORIZED — Execute with discipline' },
    STANDBY: { color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400', icon: Clock, label: 'STANDBY — Wait for better confluence' },
    INVALID: { color: 'border-loss/40 bg-loss/10 text-loss', icon: XCircle, label: 'INVALID — Skip this trade' },
}

export function TradeWorkspace({
    userId,
    accountBalance,
    riskPercent,
    defaultPair = 'XAUUSD',
    historicalTrades = [],
}: TradeWorkspaceProps) {
    const [tab, setTab] = useState('pre')
    const [pair, setPair] = useState(defaultPair)
    const [checklist, setChecklist] = useState<ChecklistResult>(DEFAULT_CHECKLIST)
    const [setupForm, setSetupForm] = useState<TradeSetupForm>(DEFAULT_FORM)
    const [riskReward, setRiskReward] = useState(0)
    const [aiVerdict, setAiVerdict] = useState<string>('STANDBY')
    const [aiBias, setAiBias] = useState<string>('NEUTRAL')
    const [aiConfidence, setAiConfidence] = useState<number>(0)
    const router = useRouter()

    const finalStatus = useMemo(() => {
        if (checklist.status === 'INVALID') return 'INVALID'
        if (aiVerdict === 'AUTHORIZED' && checklist.status === 'AUTHORIZED') return 'AUTHORIZED'
        return 'STANDBY'
    }, [checklist.status, aiVerdict])

    const statusCfg = STATUS_CONFIG[finalStatus as keyof typeof STATUS_CONFIG]
    const StatusIcon = statusCfg.icon

    async function submitWorkflowTrade(trade: {
        pair: string
        entry: number
        sl: number
        tp: number
        positionSize: number
        riskAmount: number
        potentialProfit: number
        riskReward: number
    }) {
        const preTradeResponse = await fetch('/api/pre-trade', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                pair: trade.pair,
                entry: trade.entry,
                stop_loss: trade.sl,
                take_profit: trade.tp,
                risk_percent: riskPercent,
                checklist: {
                    setup: {
                        thesisClear: checklist.directionBias !== 'Neutral',
                        trendAligned: (checklist.htfAgreement || 0) >= 67 && (checklist.ltfAgreement || 0) >= 75,
                        liquidityMapped: setupForm.liquidity.sweepOnLtf === 'Yes',
                        riskDefined: setupForm.execution.slSet === 'Yes',
                        rrAcceptable: !checklist.rrEvaluation?.shouldAvoidTrade,
                        sessionAligned: setupForm.dxy.aligned === 'Yes' || setupForm.dxy.trend === 'Neutral',
                        newsClear: setupForm.supplyDemand.confluenceStrong === 'Yes',
                        disciplineReady:
                            setupForm.traderIntent.psychology === 'Focused' &&
                            setupForm.traderIntent.environment === 'Clean / Quiet',
                    },
                    aiContext: {
                        confidence: Math.max(0, Math.min(1, aiConfidence > 0 ? aiConfidence / 100 : checklist.score / 100)),
                        structureAlignment:
                            aiVerdict === 'AUTHORIZED'
                                ? 'aligned'
                                : aiBias === 'LONG' || aiBias === 'SHORT'
                                    ? 'mixed'
                                    : 'counter',
                        regime: checklist.quarter === 'Q3' ? 'breakout' : checklist.quarter === 'Q2' ? 'range' : 'trend',
                    },
                    macroContext: {
                        biasAlignment: checklist.directionBias === 'Neutral' ? 'counter' : 'aligned',
                        eventRisk: checklist.rrEvaluation?.shouldAvoidTrade ? 'high' : 'low',
                        volatility: checklist.quarter === 'Q3' ? 'high' : 'normal',
                        sessionQuality: setupForm.traderIntent.environment === 'Clean / Quiet' ? 'good' : 'fair',
                    },
                    notes: checklist.reason,
                },
            }),
        })

        if (!preTradeResponse.ok) {
            const payload = await preTradeResponse.json().catch(() => null)
            throw new Error(payload?.error || 'Failed to create pre-trade.')
        }

        const preTradePayload = await preTradeResponse.json()

        const executionResponse = await fetch('/api/execution', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ preTradeId: preTradePayload.preTrade.id }),
        })

        if (!executionResponse.ok) {
            const payload = await executionResponse.json().catch(() => null)
            throw new Error(payload?.error || 'Failed to create execution.')
        }
    }

    const handleTradeSubmit = async (trade: {
        pair: string
        entry: number
        sl: number
        tp: number
        positionSize: number
        riskAmount: number
        potentialProfit: number
        riskReward: number
    }) => {
        setPair(trade.pair)
        try {
            await submitWorkflowTrade(trade)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to log trade.')
            return
        }

        toast.success(`Trade logged for ${trade.pair} — review it in Journal`)

        setTimeout(() => {
            router.push('/dashboard/journal')
        }, 1500)
    }

    const shouldBlockExecution = checklist.status !== 'AUTHORIZED'

    return (
        <div className="page-wrap overflow-auto pb-24">
            <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium', statusCfg.color)}>
                <StatusIcon className="h-4 w-4 shrink-0" />
                <span>{statusCfg.label}</span>
                {checklist.score > 0 && (
                    <Badge variant="outline" className={cn('ml-auto', statusCfg.color)}>
                        Score: {checklist.score.toFixed(0)}%
                    </Badge>
                )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Execution Control Center</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-4">
                        <MetricTile label="Instrument" value={pair} />
                        <MetricTile label="Setup Grade" value={checklist.grade} tone={checklist.grade === 'F' ? 'loss' : 'profit'} />
                        <MetricTile label="Direction Bias" value={checklist.directionBias || 'Neutral'} tone={checklist.directionBias === 'Neutral' ? 'loss' : 'profit'} />
                        <MetricTile label="RR Engine" value={checklist.rrEvaluation?.label || 'Waiting'} tone={checklist.rrEvaluation?.shouldAvoidTrade ? 'loss' : 'neutral'} />
                    </CardContent>
                </Card>
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Execution Gates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <GateRow icon={ShieldCheck} label="Checklist" passed={checklist.status === 'AUTHORIZED'} />
                        <GateRow icon={CandlestickChart} label="RR Engine" passed={!checklist.rrEvaluation?.shouldAvoidTrade || checklist.quarter === 'Q3'} />
                        <GateRow icon={AlertTriangle} label="DXY Confirmation" passed={setupForm.dxy.aligned === 'Yes' || setupForm.dxy.trend === 'Neutral'} />
                        <GateRow icon={History} label="Historical Match" passed={(checklist.historicalMatches?.length || 0) > 0} optional />
                    </CardContent>
                </Card>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-11 w-full justify-start gap-1 rounded-xl bg-white/5 p-1 sm:w-auto">
                    <TabsTrigger value="pre" className="gap-2">
                        <CheckCircle className="h-3.5 w-3.5" /> Pre-Trade
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="gap-2">
                        <CandlestickChart className="h-3.5 w-3.5" /> Execution
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="gap-2">
                        AI Analysis
                        {aiConfidence > 0 && (
                            <Badge variant="outline" className="ml-1 text-xs">{aiConfidence}%</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pre" className="mt-4">
                    <ProfessionalChecklist
                        riskReward={riskReward}
                        historicalTrades={historicalTrades}
                        onChange={({ form, result }) => {
                            setSetupForm(form)
                            setChecklist(result)
                        }}
                    />
                </TabsContent>

                <TabsContent value="execution" className="mt-4 space-y-4">
                    <Card className="glass-panel">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{pair} — Live Chart</CardTitle>
                                <a
                                    href={`https://www.tradingview.com/chart/?symbol=OANDA:${pair}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                >
                                    Open full screen →
                                </a>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[360px] overflow-hidden rounded-xl border border-white/8 bg-black/20">
                                <iframe
                                    title={`${pair} TradingView Chart`}
                                    src={`https://s.tradingview.com/widgetembed/?symbol=OANDA:${pair}&interval=60&theme=dark&style=1&locale=en&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&details=0`}
                                    className="h-full w-full"
                                    allowFullScreen
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <RiskCalculator
                        accountBalance={accountBalance}
                        riskPercent={riskPercent}
                        checklistStatus={checklist.status}
                        pair={pair}
                        onPairChange={setPair}
                        onRiskRewardChange={setRiskReward}
                        onTradeSubmit={handleTradeSubmit}
                    />

                    {shouldBlockExecution ? (
                        <Card className="glass-panel border-loss/20 bg-loss/6">
                            <CardContent className="py-4 text-sm leading-6 text-muted-foreground">
                                Execution is blocked because the pre-trade engine has not authorized this setup yet. Improve alignment, structure, and RR before logging the trade.
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                <TabsContent value="analysis" className="mt-4">
                    <AIAnalysisPanel
                        symbol={pair}
                        checklist={checklist}
                        onChange={(verdict, bias, confidence) => {
                            setAiVerdict(verdict)
                            setAiBias(bias)
                            setAiConfidence(confidence)
                        }}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MetricTile({
    label,
    value,
    tone = 'neutral',
}: {
    label: string
    value: string
    tone?: 'profit' | 'loss' | 'neutral'
}) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-sm font-semibold', tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-foreground')}>
                {value}
            </p>
        </div>
    )
}

function GateRow({
    icon: Icon,
    label,
    passed,
    optional = false,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    passed: boolean
    optional?: boolean
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
            </div>
            <Badge variant="outline" className={cn(
                'border-white/10',
                passed ? 'text-profit' : optional ? 'text-yellow-400' : 'text-loss'
            )}>
                {passed ? 'Pass' : optional ? 'Optional' : 'Fail'}
            </Badge>
        </div>
    )
}
