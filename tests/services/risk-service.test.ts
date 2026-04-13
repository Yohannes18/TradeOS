import { describe, expect, it } from 'vitest'
import { calculatePositionSize, calculateTradeMetrics } from '@/lib/services/risk-service'

describe('risk-service', () => {
  it('calculates deterministic position sizing from account balance and stop distance', () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPercent: 1,
      entry: 1.1,
      stopLoss: 1.095,
    })

    expect(result.riskAmount).toBe('100.00000000')
    expect(Number(result.positionSize)).toBeCloseTo(20000, 2)
  })

  it('calculates pnl and rr for a closed long execution', () => {
    const metrics = calculateTradeMetrics({
      entry: 1.1,
      stopLoss: 1.095,
      takeProfit: 1.112,
      exitPrice: 1.108,
      positionSize: 20000,
    })

    expect(metrics.pnl).toBeCloseTo(160, 2)
    expect(metrics.rrRatio).toBeCloseTo(1.6, 4)
    expect(metrics.winLoss).toBe('win')
  })
})
