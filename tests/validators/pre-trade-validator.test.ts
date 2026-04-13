import { describe, expect, it } from 'vitest'
import { createPreTradeSchema } from '@/lib/validators/pre-trade'

const basePayload = {
  pair: 'EURUSD',
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
      confidence: 0.8,
      structureAlignment: 'aligned',
      regime: 'trend',
    },
    macroContext: {
      biasAlignment: 'aligned',
      eventRisk: 'low',
      volatility: 'normal',
      sessionQuality: 'good',
    },
  },
}

describe('createPreTradeSchema', () => {
  it('accepts valid long and short trade geometry', () => {
    expect(() =>
      createPreTradeSchema.parse({
        ...basePayload,
        entry: 1.1,
        stop_loss: 1.095,
        take_profit: 1.112,
      }),
    ).not.toThrow()

    expect(() =>
      createPreTradeSchema.parse({
        ...basePayload,
        entry: 1.1,
        stop_loss: 1.105,
        take_profit: 1.088,
      }),
    ).not.toThrow()
  })

  it('rejects invalid stop-loss placement for the inferred direction', () => {
    expect(() =>
      createPreTradeSchema.parse({
        ...basePayload,
        entry: 1.1,
        stop_loss: 1.105,
        take_profit: 1.112,
      }),
    ).toThrow(/stop loss must be below entry/i)

    expect(() =>
      createPreTradeSchema.parse({
        ...basePayload,
        entry: 1.1,
        stop_loss: 1.095,
        take_profit: 1.088,
      }),
    ).toThrow(/stop loss must be above entry/i)
  })
})
