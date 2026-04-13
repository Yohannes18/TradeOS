import { z } from 'zod'

export const decimalInputSchema = z.union([z.string(), z.number()]).transform((value) => Number(value))

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
})

export function roundTo(value: number, precision = 4) {
  return Number(value.toFixed(precision))
}
