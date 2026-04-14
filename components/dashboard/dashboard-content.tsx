'use client'

import { useState } from 'react'
import { ChecklistPanel } from './checklist-panel'
import { ExecutionPanel } from './execution-panel'
import { TradingAnalysisPanel } from './trading-analysis-panel'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ClipboardCheck, CandlestickChart, BrainCircuit } from 'lucide-react'
import { toast } from 'sonner'
import type { SessionValue } from '@/lib/session'

interface Settings {
  risk_percent: number
  account_balance: number
}

type Mode = 'checklist' | 'execution' | 'analysis'

type TradeDecision = 'VALID' | 'RISKY' | 'NO TRADE'

type ChecklistContext = {
  session: SessionValue
  regime: 'trend' | 'range' | 'volatile'
  rr: number
}

interface DashboardContentProps {
  userId: string
  settings: Settings
}

export function DashboardContent({ userId, settings }: DashboardContentProps) {
  const [mode, setMode] = useState<Mode>('checklist')
  const [selectedPair, setSelectedPair] = useState('XAUUSD')
  const [score, setScore] = useState(0)
  const [decision, setDecision] = useState<TradeDecision>('NO TRADE')
  const [checklistContext, setChecklistContext] = useState<ChecklistContext>({
    session: 'london',
    regime: 'range',
    rr: 1,
  })
  const [lastChecklistLogId, setLastChecklistLogId] = useState<string | null>(null)
  const bias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const notes = ''
  const router = useRouter()

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
    const checklistPayload = {
      setup: {
        thesisClear: score >= 6,
        trendAligned: checklistContext.regime === 'trend',
        liquidityMapped: true,
        riskDefined: true,
        rrAcceptable: trade.riskReward >= 1,
        sessionAligned: checklistContext.session === 'london' || checklistContext.session === 'ny',
        newsClear: true,
        disciplineReady: decision !== 'NO TRADE',
      },
      aiContext: {
        confidence: Math.max(0, Math.min(1, score / 10)),
        structureAlignment: bias === 'neutral' ? 'mixed' : 'aligned',
        regime: checklistContext.regime === 'volatile' ? 'breakout' : checklistContext.regime,
      },
      macroContext: {
        biasAlignment: bias === 'neutral' ? 'counter' : 'aligned',
        eventRisk: 'low',
        volatility: checklistContext.regime === 'volatile' ? 'high' : 'normal',
        sessionQuality: checklistContext.session === 'london' ? 'good' : 'fair',
      },
      notes,
    }

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
        risk_percent: settings.risk_percent,
        checklist: checklistPayload,
      }),
    })

    if (!preTradeResponse.ok) {
      const payload = await preTradeResponse.json().catch(() => null)
      toast.error(payload?.error || 'Failed to log trade. Please try again.')
      return
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
      toast.error(payload?.error || 'Failed to log trade. Please try again.')
      return
    }

    if (lastChecklistLogId) {
      setLastChecklistLogId(null)
    }

    toast.success('Trade logged in journal')

    setMode('analysis')
    router.refresh()
  }

  return (
    <div className="page-wrap h-full overflow-hidden">
      <section className="page-hero px-5 py-5 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,160,255,0.14),transparent_24%),radial-gradient(circle_at_22%_25%,rgba(96,228,187,0.08),transparent_18%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Trade Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Move from checklist to execution without losing context.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Keep the workflow simple: validate the setup, size the trade, then review the signal with cleaner analysis.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/8 bg-white/4 p-2">
        <Button
          variant={mode === 'checklist' ? 'secondary' : 'ghost'}
          className="gap-2 rounded-2xl"
          onClick={() => setMode('checklist')}
        >
          <ClipboardCheck className="h-4 w-4" />
          Pre-Trade
        </Button>
        <Button
          variant={mode === 'execution' ? 'secondary' : 'ghost'}
          className="gap-2 rounded-2xl"
          onClick={() => setMode('execution')}
        >
          <CandlestickChart className="h-4 w-4" />
          Execution
        </Button>
        <Button
          variant={mode === 'analysis' ? 'secondary' : 'ghost'}
          className="gap-2 rounded-2xl"
          onClick={() => setMode('analysis')}
        >
          <BrainCircuit className="h-4 w-4" />
          AI Analysis
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-white/8 bg-white/3 p-1">
        {mode === 'checklist' && (
          <ChecklistPanel
            userId={userId}
            onScoreChange={setScore}
            onDecisionChange={setDecision}
            onContextChange={setChecklistContext}
            onLogSaved={setLastChecklistLogId}
          />
        )}

        {mode === 'execution' && (
          <ExecutionPanel
            selectedPair={selectedPair}
            score={score}
            decision={decision}
            accountBalance={settings.account_balance}
            riskPercent={settings.risk_percent}
            onPairSelect={setSelectedPair}
            onTradeSubmit={handleTradeSubmit}
          />
        )}

        {mode === 'analysis' && (
          <TradingAnalysisPanel />
        )}
      </div>
    </div>
  )
}
