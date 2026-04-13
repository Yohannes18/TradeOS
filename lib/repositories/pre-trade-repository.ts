import type { SupabaseClient } from '@supabase/supabase-js'
import type { PreTrade } from '@/lib/domain/trading'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class PreTradeRepository {
  constructor(private readonly db: DbClient) {}

  async create(payload: Omit<PreTrade, 'id' | 'created_at'>): Promise<PreTrade> {
    const { data, error } = await this.db.from('pre_trades').insert(payload).select('*').single()

    if (error || !data) {
      throw new ApiError(500, 'Failed to create pre-trade.', error?.message)
    }

    return data as PreTrade
  }

  async getOwnedById(id: string, userId: string): Promise<PreTrade | null> {
    const { data, error } = await this.db
      .from('pre_trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new ApiError(500, 'Failed to fetch pre-trade.', error.message)
    }

    return (data as PreTrade | null) ?? null
  }
}
