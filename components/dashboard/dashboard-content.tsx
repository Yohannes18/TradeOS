'use client'

import { useState } from 'react'
import { ChecklistPanel } from './checklist-panel'
import { ChartPanel } from './chart-panel'
import { FundamentalsPanel } from './fundamentals-panel'
import { RiskCalculator } from './risk-calculator'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Settings {
  risk_percent: number
  account_balance: number
}

interface DashboardContentProps {
  userId: string
  settings: Settings
}

export function DashboardContent({ userId, settings }: DashboardContentProps) {
  const [selectedPair, setSelectedPair] = useState('XAUUSD')
  const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral'>('neutral')
  const [notes, setNotes] = useState('')
  const [score, setScore] = useState(0)
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
    await supabase.from('trades').insert({
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
    router.refresh()
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* Main content area - 3 column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left sidebar - Checklist */}
        <div className="lg:col-span-3 xl:col-span-2 overflow-auto">
          <ChecklistPanel userId={userId} onScoreChange={setScore} />
        </div>

        {/* Center - Chart area */}
        <div className="lg:col-span-6 xl:col-span-7 overflow-hidden">
          <ChartPanel onPairSelect={setSelectedPair} />
        </div>

        {/* Right sidebar - Fundamentals */}
        <div className="lg:col-span-3 xl:col-span-3 overflow-auto">
          <FundamentalsPanel 
            pair={selectedPair} 
            onBiasChange={setBias}
            onNotesChange={setNotes}
          />
        </div>
      </div>

      {/* Bottom - Risk Calculator */}
      <div className="flex-shrink-0">
        <RiskCalculator 
          accountBalance={settings.account_balance}
          riskPercent={settings.risk_percent}
          onTradeSubmit={handleTradeSubmit}
        />
      </div>
    </div>
  )
}
