import { cache } from 'react'
import { TradeMetricsRepository } from '@/lib/repositories/trade-metrics-repository'
import { createAdminClient } from '@/lib/supabase/admin'

export const getCachedTradingAnalytics = cache(async (userId: string) => {
  const db = createAdminClient()
  const repository = new TradeMetricsRepository(db)
  return repository.getAnalyticsOverview(userId)
})
