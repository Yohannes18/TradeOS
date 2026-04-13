import type { SupabaseClient } from '@supabase/supabase-js'
import type { TradeMetrics, TradingAnalyticsOverview } from '@/lib/domain/trading'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class TradeMetricsRepository {
  constructor(private readonly db: DbClient) {}

  async upsertByExecution(payload: Omit<TradeMetrics, 'id' | 'computed_at'>): Promise<TradeMetrics> {
    const { data, error } = await this.db
      .from('trade_metrics')
      .upsert(payload, { onConflict: 'execution_id' })
      .select('*')
      .single()

    if (error || !data) {
      throw new ApiError(500, 'Failed to store trade metrics.', error?.message)
    }

    return data as TradeMetrics
  }

  async getByExecutionId(executionId: string): Promise<TradeMetrics | null> {
    const { data, error } = await this.db
      .from('trade_metrics')
      .select('*')
      .eq('execution_id', executionId)
      .maybeSingle()

    if (error) {
      throw new ApiError(500, 'Failed to fetch trade metrics.', error.message)
    }

    return (data as TradeMetrics | null) ?? null
  }

  async getAnalyticsOverview(userId: string): Promise<TradingAnalyticsOverview> {
    const { data, error } = await this.db.rpc('get_trading_analytics_overview', {
      p_user_id: userId,
    })

    if (error) {
      throw new ApiError(500, 'Failed to fetch analytics overview.', error.message)
    }

    const row = Array.isArray(data) ? data[0] : data

    return {
      openExecutions: Number(row?.open_executions ?? 0),
      closedExecutions: Number(row?.closed_executions ?? 0),
      journalsCompleted: Number(row?.journals_completed ?? 0),
      winRate: Number(row?.win_rate ?? 0),
      netPnl: Number(row?.net_pnl ?? 0),
      averageRr: Number(row?.average_rr ?? 0),
      averageAdherence: Number(row?.average_adherence ?? 0),
    }
  }
}
