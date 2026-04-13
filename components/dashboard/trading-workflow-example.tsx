'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCreatePreTrade, useExecuteTrade, useTradingAnalyticsOverview } from '@/hooks/use-trading-workflow'

type CreatePreTradeResponse = {
  preTrade: {
    id: string
  }
}

export function TradingWorkflowExample() {
  const analytics = useTradingAnalyticsOverview()
  const createPreTrade = useCreatePreTrade()
  const executeTrade = useExecuteTrade()
  const [lastPreTradeId, setLastPreTradeId] = useState<string | null>(null)

  async function handleCreate() {
    const response = (await createPreTrade.mutateAsync({
      pair: 'EURUSD',
      entry: 1.0825,
      stop_loss: 1.0795,
      take_profit: 1.0885,
      risk_percent: 1,
      checklist: {
        setup: {
          thesisClear: true,
          trendAligned: true,
          liquidityMapped: true,
          riskDefined: true,
          rrAcceptable: true,
          sessionAligned: true,
          newsClear: true,
          disciplineReady: true,
        },
        aiContext: {
          confidence: 0.84,
          structureAlignment: 'aligned',
          regime: 'trend',
        },
        macroContext: {
          biasAlignment: 'aligned',
          eventRisk: 'low',
          volatility: 'normal',
          sessionQuality: 'good',
        },
        notes: 'London continuation after pullback into daily imbalance.',
      },
    })) as CreatePreTradeResponse

    setLastPreTradeId(response.preTrade.id)
  }

  async function handleExecute() {
    if (!lastPreTradeId) return
    await executeTrade.mutateAsync({ preTradeId: lastPreTradeId })
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <h3 className="text-sm font-semibold">Workflow API Example</h3>
        <p className="text-sm text-muted-foreground">
          This client stays thin: it submits intent, while scoring, validation, ownership, locking, and sizing stay on the
          server.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={createPreTrade.isPending}>
          Create Pre-Trade
        </Button>
        <Button onClick={handleExecute} disabled={!lastPreTradeId || executeTrade.isPending} variant="secondary">
          Execute Locked Trade
        </Button>
      </div>

      <pre className="overflow-auto rounded-lg bg-black/30 p-3 text-xs">
        {JSON.stringify(analytics.data ?? { loading: analytics.isLoading }, null, 2)}
      </pre>
    </div>
  )
}
