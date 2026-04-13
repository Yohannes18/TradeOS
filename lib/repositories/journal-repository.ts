import type { SupabaseClient } from '@supabase/supabase-js'
import type { Journal } from '@/lib/domain/trading'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class JournalRepository {
  constructor(private readonly db: DbClient) { }

  async create(payload: Omit<Journal, 'id' | 'created_at'>): Promise<Journal> {
    const { data, error } = await this.db
      .from('journals')
      .insert(payload)
      .select('id, execution_id, user_id, emotions, mistakes, adherence_score, notes, created_at')
      .single()

    if (error || !data) {
      if (error?.code === '23505') {
        throw new ApiError(409, 'Execution already has a journal entry.', error.message)
      }

      if (error?.code === '23503') {
        throw new ApiError(404, 'Execution not found for journaling.', error.message)
      }

      throw new ApiError(500, 'Failed to create journal entry.', error?.message)
    }

    return data as Journal
  }

  async getByExecution(executionId: string, userId: string): Promise<Journal | null> {
    const { data, error } = await this.db
      .from('journals')
      .select('id, execution_id, user_id, emotions, mistakes, adherence_score, notes, created_at')
      .eq('execution_id', executionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new ApiError(500, 'Failed to fetch journal entry.', error.message)
    }

    return (data as Journal | null) ?? null
  }
}
