import type { SupabaseClient } from '@supabase/supabase-js'
import type { Execution } from '@/lib/domain/trading'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

type CreateExecutionPayload = {
  user_id: string
  pre_trade_id: string
  entry: string
  stop_loss: string
  take_profit: string
  risk_percent: string
  position_size: string
}

export class ExecutionRepository {
  constructor(private readonly db: DbClient) { }

  async create(payload: CreateExecutionPayload): Promise<Execution> {
    const { data, error } = await this.db
      .from('executions')
      .insert({
        ...payload,
        status: 'executed',
        close_price: null,
      })
      .select('id, user_id, pre_trade_id, entry, stop_loss, take_profit, risk_percent, position_size, close_price, status, executed_at, closed_at')
      .single()

    if (error || !data) {
      throw new ApiError(500, 'Failed to create execution.', error?.message)
    }

    return data as Execution
  }

  async getOwnedById(id: string, userId: string): Promise<Execution | null> {
    const { data, error } = await this.db
      .from('executions')
      .select('id, user_id, pre_trade_id, entry, stop_loss, take_profit, risk_percent, position_size, close_price, status, executed_at, closed_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new ApiError(500, 'Failed to fetch execution.', error.message)
    }

    return (data as Execution | null) ?? null
  }

  async closeAtomically(input: {
    executionId: string
    userId: string
    closePrice: string
    pnl: number
    rrRatio: number
    winLoss: 'win' | 'loss' | 'breakeven'
  }) {
    const { error } = await this.db.rpc('close_execution_and_store_metrics', {
      p_close_price: input.closePrice,
      p_execution_id: input.executionId,
      p_pnl: input.pnl,
      p_rr_ratio: input.rrRatio,
      p_user_id: input.userId,
      p_win_loss: input.winLoss,
    })

    if (error) {
      throw new ApiError(500, 'Failed to close execution.', error.message)
    }
  }
}
