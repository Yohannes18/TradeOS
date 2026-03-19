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

interface Settings {
  risk_percent: number
  account_balance: number
}

type Mode = 'checklist' | 'execution' | 'analysis'

type TradeDecision = 'VALID' | 'RISKY' | 'NO TRADE'

interface DashboardContentProps {
  userId: string
  settings: Settings
}

export function DashboardContent({ userId, settings }: DashboardContentProps) {
  const [mode, setMode] = useState<Mode>('checklist')
  const [selectedPair, setSelectedPair] = useState('XAUUSD')
  const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral'>('neutral')
  const [notes, setNotes] = useState('')
  const [score, setScore] = useState(0)
  const [decision, setDecision] = useState<TradeDecision>('NO TRADE')
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
    const { error } = await supabase.from('trades').insert({
      user_id: userId,
      pair: trade.pair,
      score,
      bias,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      result: 'pending',
      notes,
    })

    if (error) {
      toast.error('Failed to log trade. Please try again.')
      return
    }

    toast.success('Trade logged successfully')

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
          Trading Analysis
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {mode === 'checklist' && (
          <ChecklistPanel
            userId={userId}
            onScoreChange={setScore}
            onDecisionChange={setDecision}
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
            onBiasChange={setBias}
            onNotesChange={setNotes}
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
