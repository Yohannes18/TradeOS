import { z } from 'zod'
import { decimalInputSchema } from '@/lib/validators/common'

const checklistSetupSchema = z.object({
  thesisClear: z.boolean(),
  trendAligned: z.boolean(),
  liquidityMapped: z.boolean(),
  riskDefined: z.boolean(),
  rrAcceptable: z.boolean(),
  sessionAligned: z.boolean(),
  newsClear: z.boolean(),
  disciplineReady: z.boolean(),
})

const aiContextSchema = z.object({
  confidence: decimalInputSchema.pipe(z.number().min(0).max(1)),
  structureAlignment: z.enum(['aligned', 'mixed', 'counter']),
  regime: z.enum(['trend', 'range', 'breakout']),
})

const macroContextSchema = z.object({
  biasAlignment: z.enum(['aligned', 'mixed', 'counter']),
  eventRisk: z.enum(['low', 'medium', 'high']),
  volatility: z.enum(['low', 'normal', 'high']),
  sessionQuality: z.enum(['poor', 'fair', 'good']),
})

export const createPreTradeSchema = z
  .object({
    pair: z.string().trim().min(3).max(20).transform((value) => value.toUpperCase()),
    entry: decimalInputSchema.pipe(z.number().positive()),
    stop_loss: decimalInputSchema.pipe(z.number().positive()),
    take_profit: decimalInputSchema.pipe(z.number().positive()),
    risk_percent: decimalInputSchema.pipe(z.number().gt(0).lte(10)),
    checklist: z.object({
      setup: checklistSetupSchema,
      aiContext: aiContextSchema,
      macroContext: macroContextSchema,
      notes: z.string().trim().max(2000).optional(),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.entry === value.stop_loss) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stop_loss'],
        message: 'Stop loss must differ from entry.',
      })
    }

    if (value.entry === value.take_profit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['take_profit'],
        message: 'Take profit must differ from entry.',
      })
    }

    const isLong = value.take_profit > value.entry
    const isShort = value.take_profit < value.entry

    if (!isLong && !isShort) {
      return
    }

    if (isLong && value.stop_loss >= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stop_loss'],
        message: 'For long trades, stop loss must be below entry.',
      })
    }

    if (isLong && value.take_profit <= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['take_profit'],
        message: 'For long trades, take profit must be above entry.',
      })
    }

    if (isShort && value.stop_loss <= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stop_loss'],
        message: 'For short trades, stop loss must be above entry.',
      })
    }

    if (isShort && value.take_profit >= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['take_profit'],
        message: 'For short trades, take profit must be below entry.',
      })
    }
  })

export type CreatePreTradeInput = z.infer<typeof createPreTradeSchema>
