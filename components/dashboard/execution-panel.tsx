'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartPanel } from './chart-panel'
import { FundamentalsPanel } from './fundamentals-panel'
import { RiskCalculator } from './risk-calculator'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

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
    onBiasChange: (bias: 'bullish' | 'bearish' | 'neutral') => void
    onNotesChange: (notes: string) => void
    onTradeSubmit: (trade: TradeData) => void
}

export function ExecutionPanel({
    selectedPair,
    score,
    decision,
    accountBalance,
    riskPercent,
    onPairSelect,
    onBiasChange,
    onNotesChange,
    onTradeSubmit,
}: ExecutionPanelProps) {
    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Execution Readiness</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 pt-0">
                    <Badge variant="outline" className="text-xs">Pair: {selectedPair}</Badge>
                    <Badge variant="outline" className="text-xs">Checklist Score: {score}/10</Badge>
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

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8 min-h-[380px]">
                    <ChartPanel onPairSelect={onPairSelect} />
                </div>
                <div className="xl:col-span-4 min-h-[380px]">
                    <FundamentalsPanel
                        pair={selectedPair}
                        onBiasChange={onBiasChange}
                        onNotesChange={onNotesChange}
                    />
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
