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
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant={mode === 'checklist' ? 'secondary' : 'ghost'}
          className="gap-2"
          onClick={() => setMode('checklist')}
        >
          <ClipboardCheck className="h-4 w-4" />
          Pre-Trade
        </Button>
        <Button
          variant={mode === 'execution' ? 'secondary' : 'ghost'}
          className="gap-2"
          onClick={() => setMode('execution')}
        >
          <CandlestickChart className="h-4 w-4" />
          Execution
        </Button>
        <Button
          variant={mode === 'analysis' ? 'secondary' : 'ghost'}
          className="gap-2"
          onClick={() => setMode('analysis')}
        >
          <BrainCircuit className="h-4 w-4" />
          AI Analysis
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
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
