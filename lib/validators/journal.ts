import { z } from 'zod'
import { JOURNAL_EMOTIONS, JOURNAL_MISTAKES } from '@/lib/domain/trading'
import { decimalInputSchema } from '@/lib/validators/common'

export const createJournalSchema = z.object({
  execution_id: z.string().uuid(),
  emotions: z.array(z.enum(JOURNAL_EMOTIONS)).min(1).max(6),
  mistakes: z.array(z.enum(JOURNAL_MISTAKES)).max(6).default([]),
  adherence_score: decimalInputSchema.pipe(z.number().min(0).max(1)),
  notes: z.string().trim().max(4000).optional(),
}).strict()

export type CreateJournalInput = z.infer<typeof createJournalSchema>
