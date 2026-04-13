import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pre-trade/route'

const { mockGuardTradingMutation, mockCreateAdminClient, mockCreatePreTrade } = vi.hoisted(() => ({
  mockGuardTradingMutation: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockCreatePreTrade: vi.fn(),
}))

vi.mock('@/lib/security/request-guard', () => ({
  guardTradingMutation: mockGuardTradingMutation,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock('@/lib/services/pre-trade-service', () => ({
  PreTradeService: vi.fn().mockImplementation(() => ({
    create: mockCreatePreTrade,
  })),
}))

describe('POST /api/pre-trade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGuardTradingMutation.mockResolvedValue({ id: 'user-1' })
    mockCreateAdminClient.mockReturnValue({})
  })

  it('creates a validated pre-trade through the service layer', async () => {
    mockCreatePreTrade.mockResolvedValue({ id: 'pre-1', status: 'validated', final_score: 0.91 })

    const request = new NextRequest('http://localhost/api/pre-trade', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        host: 'localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        pair: 'eurusd',
        entry: 1.1,
        stop_loss: 1.095,
        take_profit: 1.112,
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
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.preTrade.id).toBe('pre-1')
    expect(mockCreatePreTrade).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        pair: 'EURUSD',
      }),
    )
  })
})
