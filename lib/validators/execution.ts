import { z } from 'zod'
import { decimalInputSchema } from '@/lib/validators/common'

export const createExecutionSchema = z.object({
  preTradeId: z.string().uuid(),
}).strict()

export const closeExecutionSchema = z.object({
  exitPrice: decimalInputSchema.pipe(z.number().positive()),
}).strict()

export type CreateExecutionInput = z.infer<typeof createExecutionSchema>
export type CloseExecutionInput = z.infer<typeof closeExecutionSchema>
