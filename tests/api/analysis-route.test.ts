import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/analysis/route'
import { AnalysisProviderError } from '@/lib/analysis/types'

const { mockRunAutoAnalysis, mockGuardTradingMutation } = vi.hoisted(() => ({
    mockRunAutoAnalysis: vi.fn(),
    mockGuardTradingMutation: vi.fn(),
}))

vi.mock('@/lib/analysis/engine', () => ({
    runAutoAnalysis: mockRunAutoAnalysis,
}))

vi.mock('@/lib/security/request-guard', () => ({
    guardTradingMutation: mockGuardTradingMutation,
}))

describe('POST /api/analysis', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGuardTradingMutation.mockResolvedValue({ id: 'user-1' })
    })

    it('returns success false for invalid payload', async () => {
        const request = new NextRequest('http://localhost/api/analysis', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ timeframe: 'intraday' }),
        })

        const response = await POST(request)
        const payload = await response.json()

        expect(response.status).toBe(400)
        expect(payload).toEqual({ success: false, error: 'Invalid analysis request payload.' })
    })

    it('returns success true with result for valid payload', async () => {
        mockRunAutoAnalysis.mockResolvedValue({
            recommendedBias: 'bullish',
            confidence: 81,
            summary: 'Strong bullish confluence.',
            keyDrivers: [],
            riskFlags: [],
            providersUsed: ['macro'],
            macroScore: { bullish: 72, bearish: 28 },
            fundamentalScore: { bullish: 69, bearish: 31 },
        })

        const request = new NextRequest('http://localhost/api/analysis', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                pair: 'eurusd',
                timeframe: 'intraday',
                notes: 'Momentum continuation',
                manualBias: 'bullish',
            }),
        })

        const response = await POST(request)
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.success).toBe(true)
        expect(mockRunAutoAnalysis).toHaveBeenCalledWith(
            expect.objectContaining({
                pair: 'EURUSD',
            }),
        )
    })

    it('returns success false when provider fails', async () => {
        mockRunAutoAnalysis.mockRejectedValue(new AnalysisProviderError('Provider unavailable'))

        const request = new NextRequest('http://localhost/api/analysis', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ pair: 'XAUUSD' }),
        })

        const response = await POST(request)
        const payload = await response.json()

        expect(response.status).toBe(503)
        expect(payload).toEqual({ success: false, error: 'Failed to run auto analysis.' })
    })
})