'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartPanel } from './chart-panel'
import { RiskCalculator } from './risk-calculator'
import { AlertTriangle, CheckCircle2, ShieldAlert, Activity } from 'lucide-react'

interface TradeData {
    pair: string
    entry: number
    sl: number
    tp: number
    positionSize: number
    riskAmount: number
    potentialProfit: number
    riskReward: number
}

interface ExecutionPanelProps {
    selectedPair: string
    score: number
    decision: 'VALID' | 'RISKY' | 'NO TRADE'
    accountBalance: number
    riskPercent: number
    onPairSelect: (pair: string) => void
    onTradeSubmit: (trade: TradeData) => void
}

export function ExecutionPanel({
    selectedPair,
    score,
    decision,
    accountBalance,
    riskPercent,
    onPairSelect,
    onTradeSubmit,
}: ExecutionPanelProps) {
    return (
        <div className="flex h-full flex-col gap-4">
            <section className="page-hero px-6 py-5 sm:px-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,160,255,0.14),transparent_24%),radial-gradient(circle_at_22%_20%,rgba(96,228,187,0.08),transparent_18%)]" />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-primary">
                        <Activity className="h-3.5 w-3.5" />
                        Execution Workspace
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        Confirm the chart, size the position, then log the trade with confidence.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                        The layout keeps readiness, chart context, and risk sizing in one flow so execution stays deliberate under pressure.
                    </p>
                </div>
            </section>

            <Card className="glass-panel interactive-panel overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Execution Readiness</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                A quick pressure-check before position sizing and order placement.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-muted-foreground">
                            Mobile-ready and optimized for fast review
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 pt-0">
                    <Badge variant="outline" className="text-xs border-white/10 bg-white/4">Pair: {selectedPair}</Badge>
                    <Badge variant="outline" className="text-xs border-white/10 bg-white/4">Checklist Score: {score}/10</Badge>
                    {decision === 'VALID' && (
                        <Badge className="bg-profit/10 text-profit border-profit/20 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            VALID
                        </Badge>
                    )}
                    {decision === 'RISKY' && (
                        <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            RISKY
                        </Badge>
                    )}
                    {decision === 'NO TRADE' && (
                        <Badge className="bg-loss/10 text-loss border-loss/20 gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            NO TRADE
                        </Badge>
                    )}
                </CardContent>
            </Card>

            <div className="flex-1 min-h-0">
                <div className="interactive-panel h-full min-h-[380px] overflow-hidden rounded-[28px] border border-white/8 bg-white/3 p-1">
                    <ChartPanel onPairSelect={onPairSelect} />
                </div>
            </div>

            <div className="flex-shrink-0">
                <RiskCalculator
                    accountBalance={accountBalance}
                    riskPercent={riskPercent}
                    onTradeSubmit={onTradeSubmit}
                />
            </div>
        </div>
    )
}
