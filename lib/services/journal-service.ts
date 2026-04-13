import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateJournalInput } from '@/lib/validators/journal'
import { ExecutionRepository } from '@/lib/repositories/execution-repository'
import { JournalRepository } from '@/lib/repositories/journal-repository'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class JournalService {
  private readonly journals: JournalRepository
  private readonly executions: ExecutionRepository

  constructor(db: DbClient) {
    this.journals = new JournalRepository(db)
    this.executions = new ExecutionRepository(db)
  }

  async create(userId: string, input: CreateJournalInput) {
    const execution = await this.executions.getOwnedById(input.execution_id, userId)

    if (!execution) {
      throw new ApiError(404, 'Execution not found for journaling.')
    }

    if (execution.status !== 'closed') {
      throw new ApiError(409, 'Journal entry requires a closed execution.')
    }

    const existingJournal = await this.journals.getByExecution(input.execution_id, userId)
    if (existingJournal) {
      throw new ApiError(409, 'Execution already has a journal entry.')
    }

    return this.journals.create({
      execution_id: input.execution_id,
      user_id: userId,
      emotions: input.emotions,
      mistakes: input.mistakes,
      adherence_score: input.adherence_score,
      notes: input.notes ?? null,
    })
  }
}
