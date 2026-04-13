import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/execution/[id]/close/route'

const { mockGuardTradingMutation, mockCreateAdminClient, mockCloseExecution } = vi.hoisted(() => ({
  mockGuardTradingMutation: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockCloseExecution: vi.fn(),
}))

vi.mock('@/lib/security/request-guard', () => ({
  guardTradingMutation: mockGuardTradingMutation,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock('@/lib/services/execution-service', () => ({
  ExecutionService: vi.fn().mockImplementation(() => ({
    close: mockCloseExecution,
  })),
}))

describe('PATCH /api/execution/:id/close', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGuardTradingMutation.mockResolvedValue({ id: 'user-1' })
    mockCreateAdminClient.mockReturnValue({})
  })

  it('closes an execution and persists metrics', async () => {
    mockCloseExecution.mockResolvedValue({
      execution: { id: 'exec-1', status: 'closed' },
      metrics: { pnl: 145.5, rr_ratio: 1.455, win_loss: 'win' },
    })

    const request = new NextRequest('http://localhost/api/execution/550e8400-e29b-41d4-a716-446655440000/close', {
      method: 'PATCH',
      headers: {
        origin: 'http://localhost',
        host: 'localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ exitPrice: 1.108 }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockCloseExecution).toHaveBeenCalledWith('user-1', '550e8400-e29b-41d4-a716-446655440000', {
      exitPrice: 1.108,
    })
    expect(payload.metrics.win_loss).toBe('win')
  })
})
