'use client'

import { useState } from 'react'
import { ChecklistPanel } from './checklist-panel'
import { ExecutionPanel } from './execution-panel'
import { TradingAnalysisPanel } from './trading-analysis-panel'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
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
    const setupGrade = score >= 8 ? 'A' : score >= 6 ? 'B' : 'C'
    const direction: 'buy' | 'sell' = trade.entry >= trade.sl ? 'buy' : 'sell'

    const { data, error } = await supabase.from('trades').insert({
      user_id: userId,
      pair: trade.pair,
      score,
      bias,
      direction,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      rr: trade.riskReward,
      risk_amount: trade.riskAmount,
      position_size: trade.positionSize,
      result: 'pending',
      checklist_score: score,
      setup_grade: setupGrade,
      fundamental_bias: bias,
      session: checklistContext.session,
      market_regime: checklistContext.regime,
      trade_date: new Date().toISOString().slice(0, 10),
      notes,
    }).select('id').single()

    if (error) {
      toast.error('Failed to log trade. Please try again.')
      return
    }

    if (data?.id && lastChecklistLogId) {
      await supabase
        .from('checklist_logs')
        .update({ trade_id: data.id })
        .eq('id', lastChecklistLogId)
        .eq('user_id', userId)
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
