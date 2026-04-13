'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Request failed.')
  }

  return response.json()
}

export function useTradingAnalyticsOverview() {
  return useQuery({
    queryKey: ['trading-analytics-overview'],
    queryFn: () => request('/api/analytics/overview'),
  })
}

export function useCreatePreTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) =>
      request('/api/pre-trade', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trading-analytics-overview'] })
    },
  })
}

export function useExecuteTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { preTradeId: string }) =>
      request('/api/execution', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trading-analytics-overview'] })
    },
  })
}

export function useCloseTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, exitPrice }: { id: string; exitPrice: number }) =>
      request(`/api/execution/${id}/close`, {
        method: 'PATCH',
        body: JSON.stringify({ exitPrice }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trading-analytics-overview'] })
    },
  })
}

export function useCreateJournal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) =>
      request('/api/journal', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trading-analytics-overview'] })
    },
  })
}
