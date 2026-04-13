import type { AIVerdict, ChecklistPayload } from '@/lib/domain/trading'
import { roundTo } from '@/lib/validators/common'

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

function mapScore<T extends string>(value: T, scores: Record<T, number>) {
  return scores[value]
}

export function calculateChecklistScore(checklist: ChecklistPayload) {
  const values = Object.values(checklist.setup)
  return roundTo(values.filter(Boolean).length / values.length)
}

export function calculateAiScore(checklist: ChecklistPayload, entry: number, stopLoss: number, takeProfit: number, riskPercent: number) {
  const rr = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)
  const rrScore = rr >= 2 ? 1 : rr >= 1.5 ? 0.75 : rr >= 1 ? 0.5 : 0.2
  const structureScore = mapScore(checklist.aiContext.structureAlignment, {
    aligned: 1,
    mixed: 0.6,
    counter: 0.2,
  })
  const regimeScore = mapScore(checklist.aiContext.regime, {
    trend: 1,
    breakout: 0.85,
    range: 0.65,
  })
  const riskPenalty = riskPercent <= 2 ? 1 : riskPercent <= 3 ? 0.85 : 0.7

  return roundTo(clamp(average([checklist.aiContext.confidence, structureScore, regimeScore, rrScore]) * riskPenalty))
}

export function calculateMacroScore(checklist: ChecklistPayload) {
  const alignmentScore = mapScore(checklist.macroContext.biasAlignment, {
    aligned: 1,
    mixed: 0.6,
    counter: 0.25,
  })
  const eventScore = mapScore(checklist.macroContext.eventRisk, {
    low: 1,
    medium: 0.6,
    high: 0.2,
  })
  const volatilityScore = mapScore(checklist.macroContext.volatility, {
    normal: 1,
    high: 0.75,
    low: 0.65,
  })
  const sessionScore = mapScore(checklist.macroContext.sessionQuality, {
    good: 1,
    fair: 0.7,
    poor: 0.35,
  })

  return roundTo(clamp(average([alignmentScore, eventScore, volatilityScore, sessionScore])))
}

export function calculateFinalScore(checklistScore: number, aiScore: number, macroScore: number) {
  return roundTo(clamp(checklistScore * 0.5 + aiScore * 0.3 + macroScore * 0.2))
}

export function resolveVerdict(finalScore: number): AIVerdict {
  if (finalScore >= 0.7) {
    return 'AUTHORIZED'
  }

  if (finalScore >= 0.55) {
    return 'STANDBY'
  }

  return 'INVALID'
}
