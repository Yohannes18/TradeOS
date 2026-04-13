import type { SupabaseClient } from '@supabase/supabase-js'
import type { RiskProfile } from '@/lib/domain/trading'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class SettingsRepository {
  constructor(private readonly db: DbClient) {}

  async getRiskProfile(userId: string): Promise<RiskProfile> {
    const { data, error } = await this.db
      .from('settings')
      .select('account_balance, risk_percent')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      throw new ApiError(400, 'Trading settings are required before execution.', error?.message)
    }

    return data as RiskProfile
  }
}
