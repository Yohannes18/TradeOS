import { describe, expect, it } from 'vitest'
import {
  calculateAiScore,
  calculateChecklistScore,
  calculateFinalScore,
  calculateMacroScore,
  resolveVerdict,
} from '@/lib/services/scoring-service'
import type { ChecklistPayload } from '@/lib/domain/trading'

const checklist: ChecklistPayload = {
  setup: {
    thesisClear: true,
    trendAligned: true,
    liquidityMapped: true,
    riskDefined: true,
    rrAcceptable: true,
    sessionAligned: true,
    newsClear: true,
    disciplineReady: false,
  },
  aiContext: {
    confidence: 0.82,
    structureAlignment: 'aligned',
    regime: 'trend',
  },
  macroContext: {
    biasAlignment: 'aligned',
    eventRisk: 'low',
    volatility: 'normal',
    sessionQuality: 'good',
  },
}

describe('scoring-service', () => {
  it('calculates each component and validates passing trades', () => {
    const checklistScore = calculateChecklistScore(checklist)
    const aiScore = calculateAiScore(checklist, 1.1, 1.095, 1.112, 1)
    const macroScore = calculateMacroScore(checklist)
    const finalScore = calculateFinalScore(checklistScore, aiScore, macroScore)

    expect(checklistScore).toBe(0.875)
    expect(aiScore).toBeGreaterThanOrEqual(0.9)
    expect(macroScore).toBe(1)
    expect(finalScore).toBeGreaterThanOrEqual(0.9)
    expect(resolveVerdict(finalScore)).toBe('AUTHORIZED')
  })

  it('downgrades weak trades below the workflow threshold', () => {
    const weakChecklist: ChecklistPayload = {
      setup: {
        thesisClear: false,
        trendAligned: false,
        liquidityMapped: true,
        riskDefined: true,
        rrAcceptable: false,
        sessionAligned: false,
        newsClear: false,
        disciplineReady: false,
      },
      aiContext: {
        confidence: 0.25,
        structureAlignment: 'counter',
        regime: 'range',
      },
      macroContext: {
        biasAlignment: 'counter',
        eventRisk: 'high',
        volatility: 'low',
        sessionQuality: 'poor',
      },
    }

    const finalScore = calculateFinalScore(
      calculateChecklistScore(weakChecklist),
      calculateAiScore(weakChecklist, 1.1, 1.099, 1.101, 3),
      calculateMacroScore(weakChecklist),
    )

    expect(finalScore).toBeLessThan(0.7)
    expect(resolveVerdict(finalScore)).toBe('INVALID')
  })
})
