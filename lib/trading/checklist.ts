import type {
    BinaryChoice,
    ChecklistGrade,
    ChecklistResult,
    DirectionBias,
    HistoricalMatch,
    Quarter,
    RREvaluation,
    SupplyDemandAssessment,
    TradeQuarterProfile,
    TradeSetupForm,
    TrendBias,
} from '@/lib/trading/types'

type ComparableTrade = {
    id: string
    pair: string
    result?: string | null
    setup_grade?: string | null
    trade_date?: string | null
    created_at?: string | null
    notes?: string | null
    checklist_json?: Partial<ChecklistResult & { directionBias?: DirectionBias; quarter?: Quarter }> | null
}

const YES = 'Yes'
const NO = 'No'

const QUARTER_PROFILES: Record<Quarter, TradeQuarterProfile> = {
    Q1: {
        quarter: 'Q1',
        focus: 'Reversal',
        marketBehavior: 'Quarter one favors reversal behavior after opening repricing and institutional rebalancing.',
        recommendedStrategy: 'Tighten targets and demand full confirmation before taking reversal continuation entries.',
        executionNotes: [
            'Lower TP expectations and avoid forcing extended runners.',
            'Only execute when structure, liquidity, and confirmation all align.',
            'Respect failed confirmation immediately.',
        ],
    },
    Q2: {
        quarter: 'Q2',
        focus: 'Manipulation',
        marketBehavior: 'Quarter two tends to reward manipulation, trap behavior, and forced displacement after false direction.',
        recommendedStrategy: 'Prefer counter-trend trap setups with clear liquidity engineering and confirmation.',
        executionNotes: [
            'Counter-trend logic must be backed by a sweep or engineered liquidity.',
            'Trap confirmation is mandatory before committing capital.',
            'Avoid breakout chasing without a failed move first.',
        ],
    },
    Q3: {
        quarter: 'Q3',
        focus: 'Expansion',
        marketBehavior: 'Quarter three favors expansion legs where clean breakout continuation outperforms over-processed setup logic.',
        recommendedStrategy: 'Keep execution focused on ORB breakout and Fibonacci continuation only.',
        executionNotes: [
            'Simplify the checklist and do not overfit the entry.',
            'Prioritize ORB breakout structure and Fibonacci continuation only.',
            'Ignore RR engine warnings here if the expansion thesis remains intact.',
        ],
    },
    Q4: {
        quarter: 'Q4',
        focus: 'Reversal',
        marketBehavior: 'Quarter four often rotates into reversal behavior as yearly positioning and profit protection intensify.',
        recommendedStrategy: 'Take smaller objectives and require clean confirmation into higher-timeframe reversal zones.',
        executionNotes: [
            'Lower TP expectations and tighten risk management.',
            'Use strict confirmation on reversal setups only.',
            'Do not assume year-end momentum will continue without proof.',
        ],
    },
}

export const DEFAULT_TRADE_SETUP_FORM: TradeSetupForm = {
    htfBias: {
        weekly: 'Uptrend',
        daily: 'Uptrend',
        h4: 'Uptrend',
    },
    ltfBias: {
        h1: 'Uptrend',
        m30: 'Uptrend',
        m15: 'Uptrend',
        m5: 'Uptrend',
    },
    supportResistanceAligned: YES,
    supplyDemand: {
        htfPresent: YES,
        ltfPresent: YES,
        ltfCorrectionIntoHtfZone: YES,
        confluenceStrong: YES,
    },
    liquidity: {
        sweepOnLtf: YES,
        liquidityNearSl: YES,
        type: 'Equal Lows',
    },
    bonusConfluence: {
        crtOccurred: NO,
        crtTimeframe: '4H',
        pattern: 'None',
    },
    traderIntent: {
        directionThought: 'With Trend',
        psychology: 'Focused',
        environment: 'Clean / Quiet',
    },
    execution: {
        tpSet: YES,
        slSet: YES,
    },
    dxy: {
        trend: 'Neutral',
        aligned: YES,
    },
}

export function getQuarterFromDate(date = new Date()): Quarter {
    const month = date.getMonth()
    if (month <= 2) return 'Q1'
    if (month <= 5) return 'Q2'
    if (month <= 8) return 'Q3'
    return 'Q4'
}

export function getQuarterProfile(quarter: Quarter): TradeQuarterProfile {
    return QUARTER_PROFILES[quarter]
}

function ratioTrue(values: BinaryChoice[]) {
    const yesCount = values.filter((value) => value === YES).length
    return yesCount / values.length
}

function scoreBiasAgreement(values: TrendBias[]) {
    const up = values.filter((value) => value === 'Uptrend').length
    const down = values.length - up
    const majority = Math.max(up, down)
    return Math.round((majority / values.length) * 100)
}

function resolveDirectionalBias(form: TradeSetupForm): DirectionBias {
    const htf = [form.htfBias.weekly, form.htfBias.daily, form.htfBias.h4]
    const ltf = [form.ltfBias.h1, form.ltfBias.m30, form.ltfBias.m15, form.ltfBias.m5]
    const all = [...htf, ...ltf]
    const up = all.filter((value) => value === 'Uptrend').length
    const down = all.length - up
    if (up === down) return 'Neutral'
    return up > down ? 'Bullish' : 'Bearish'
}

function buildSupplyDemandAssessment(form: TradeSetupForm): SupplyDemandAssessment {
    const score =
        (form.supplyDemand.htfPresent === YES ? 30 : 0) +
        (form.supplyDemand.ltfPresent === YES ? 20 : 0) +
        (form.supplyDemand.ltfCorrectionIntoHtfZone === YES ? 30 : 0) +
        (form.supplyDemand.confluenceStrong === YES ? 20 : 0)

    const notes: string[] = []

    if (form.supplyDemand.htfPresent === YES && form.supplyDemand.ltfPresent === YES) {
        notes.push('HTF and LTF zones are both present.')
    } else if (form.supplyDemand.htfPresent === YES || form.supplyDemand.ltfPresent === YES) {
        notes.push('Only one side of the supply-demand stack is present.')
    } else {
        notes.push('No meaningful HTF/LTF supply-demand overlap is present.')
    }

    if (form.supplyDemand.ltfCorrectionIntoHtfZone === YES) {
        notes.push('LTF correction is returning into the HTF zone.')
    } else {
        notes.push('LTF is not correcting into the HTF area yet.')
    }

    if (form.supplyDemand.confluenceStrong === YES) {
        notes.push('Zone confluence is strong enough to support execution.')
    } else {
        notes.push('Zone confluence is not yet strong enough for clean execution.')
    }

    const alignment = score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak'

    let directionBias: DirectionBias = 'Neutral'
    if (form.supplyDemand.htfPresent === YES || form.supplyDemand.ltfPresent === YES) {
        directionBias = resolveDirectionalBias(form)
    }

    return {
        alignment,
        directionBias,
        score,
        notes,
    }
}

export function evaluateRiskReward(riskReward: number, quarter: Quarter): RREvaluation {
    if (!Number.isFinite(riskReward) || riskReward <= 0) {
        return {
            score: 0,
            label: 'Unpriced',
            message: 'Set entry, stop, and target before trusting the setup.',
            shouldAvoidTrade: true,
            moveStopToBreakevenAtOneToOne: false,
        }
    }

    if (quarter === 'Q3') {
        return {
            score: 70,
            label: 'Expansion Mode',
            message: 'Q3 expansion logic is active, so ORB and Fibonacci continuation take priority over the RR engine.',
            shouldAvoidTrade: false,
            moveStopToBreakevenAtOneToOne: false,
        }
    }

    if (riskReward < 3) {
        return {
            score: 20,
            label: 'No trade or find better entry',
            message: 'Risk-reward is below 3R. Do not trade this unless you can tighten the entry or improve the target.',
            shouldAvoidTrade: true,
            moveStopToBreakevenAtOneToOne: false,
        }
    }

    if (riskReward <= 5) {
        return {
            score: 90,
            label: 'High probability setup',
            message: 'The RR profile is in the preferred institutional range for this system.',
            shouldAvoidTrade: false,
            moveStopToBreakevenAtOneToOne: false,
        }
    }

    return {
        score: 55,
        label: 'Low win rate setup',
        message: 'The RR profile is stretched. If you take it, move stop to breakeven at 1:1.',
        shouldAvoidTrade: false,
        moveStopToBreakevenAtOneToOne: true,
    }
}

export function evaluateTradeSetup({
    form,
    quarter,
    riskReward,
    historicalTrades = [],
}: {
    form: TradeSetupForm
    quarter: Quarter
    riskReward?: number
    historicalTrades?: ComparableTrade[]
}): ChecklistResult {
    const htfAgreement = scoreBiasAgreement([form.htfBias.weekly, form.htfBias.daily, form.htfBias.h4])
    const ltfAgreement = scoreBiasAgreement([form.ltfBias.h1, form.ltfBias.m30, form.ltfBias.m15, form.ltfBias.m5])
    const directionBias = resolveDirectionalBias(form)
    const supplyDemand = buildSupplyDemandAssessment(form)
    const rrEvaluation = evaluateRiskReward(riskReward || 0, quarter)
    const quarterProfile = getQuarterProfile(quarter)

    const biasAligned = htfAgreement >= 67 && ltfAgreement >= 75
    const srAligned = form.supportResistanceAligned === YES
    const liquiditySweep = form.liquidity.sweepOnLtf === YES
    const liquidityProtected = form.liquidity.liquidityNearSl === YES
    const executionReady = form.execution.tpSet === YES && form.execution.slSet === YES
    const psychologyReady =
        form.traderIntent.psychology === 'Focused' && form.traderIntent.environment === 'Clean / Quiet'
    const dxyAligned = form.dxy.aligned === YES || form.dxy.trend === 'Neutral'
    const withTrend = form.traderIntent.directionThought === 'With Trend'
    const bonusConfirmed =
        form.bonusConfluence.crtOccurred === YES || form.bonusConfluence.pattern !== 'None'

    const contextScore = Math.round(
        ((htfAgreement + ltfAgreement + (srAligned ? 100 : 0) + supplyDemand.score) / 4) * 10,
    ) / 10

    const phaseScore = Math.round(
        (((liquiditySweep ? 100 : 0) + (liquidityProtected ? 100 : 0) + (bonusConfirmed ? 85 : 40)) / 3) * 10,
    ) / 10

    let targetInputs = [executionReady ? 100 : 0, dxyAligned ? 100 : 0, rrEvaluation.score]
    if (quarter === 'Q2') {
        targetInputs.push(withTrend ? 35 : 100)
    } else if (quarter === 'Q1' || quarter === 'Q4') {
        targetInputs.push(bonusConfirmed ? 100 : 30)
    } else {
        targetInputs = [executionReady ? 100 : 0, rrEvaluation.score]
    }

    const targetScore = Math.round(
        (targetInputs.reduce((total, value) => total + value, 0) / targetInputs.length) * 10,
    ) / 10

    const checks = {
        Q1: contextScore,
        Q2: Math.round(((biasAligned ? 100 : 45) + (psychologyReady ? 100 : 30)) / 2),
        Q3: phaseScore,
        Q4: supplyDemand.score,
        Q5: targetScore,
        Q6: Math.round(((executionReady ? 100 : 0) + rrEvaluation.score + (dxyAligned ? 100 : 40)) / 3),
    }

    const score = Math.round(
        (Object.values(checks).reduce((sum, value) => sum + value, 0) / Object.values(checks).length) * 10,
    ) / 10

    const context_valid = checks.Q1 >= 65 && checks.Q2 >= 65
    const phase_valid = checks.Q3 >= 65 && checks.Q4 >= 65
    const target_valid = checks.Q5 >= 65 && checks.Q6 >= 65

    const enforcementNotes = [
        quarterProfile.marketBehavior,
        ...quarterProfile.executionNotes,
        ...supplyDemand.notes,
    ]

    if (quarter === 'Q2' && withTrend) {
        enforcementNotes.push('Q2 favors manipulation and trap logic, so with-trend execution is downgraded.')
    }

    if ((quarter === 'Q1' || quarter === 'Q4') && !bonusConfirmed) {
        enforcementNotes.push('Q1/Q4 reversal mode requires stricter confirmation than the current setup shows.')
    }

    if (form.traderIntent.psychology === 'Distracted' || form.traderIntent.environment === 'Distracting') {
        enforcementNotes.push('Trader state is not clean enough for discretionary execution.')
    }

    let grade: ChecklistGrade = 'B'
    if (score >= 90 && context_valid && phase_valid && target_valid) grade = 'A+'
    else if (score >= 84 && context_valid && phase_valid && target_valid) grade = 'A'
    else if (score >= 76 && context_valid && phase_valid && target_valid) grade = 'A-'
    else if (score >= 65 && (context_valid || phase_valid)) grade = 'B'
    else grade = 'F'

    let status: ChecklistResult['status'] = 'STANDBY'
    let reason = 'Wait for stronger confluence before execution.'

    const hardFailure =
        !executionReady ||
        !srAligned ||
        supplyDemand.alignment === 'Weak' ||
        directionBias === 'Neutral' ||
        (quarter !== 'Q3' && rrEvaluation.shouldAvoidTrade) ||
        form.traderIntent.psychology === 'Distracted' ||
        form.traderIntent.environment === 'Distracting'

    if (hardFailure) {
        status = 'INVALID'
        grade = 'F'
        reason = rrEvaluation.shouldAvoidTrade
            ? rrEvaluation.message
            : 'One or more decision gates failed. Skip the trade and wait for structure to improve.'
    } else if (grade === 'A+' || grade === 'A' || grade === 'A-') {
        status = 'AUTHORIZED'
        reason = `${grade} setup. ${quarterProfile.recommendedStrategy}`
    }

    const historicalMatches = findHistoricalMatches(historicalTrades, {
        quarter,
        directionBias,
        supportResistanceAligned: srAligned,
        supplyDemandStrong: supplyDemand.alignment === 'Strong',
        liquidityType: form.liquidity.type,
        trendIntent: form.traderIntent.directionThought,
    })

    return {
        status,
        grade: status === 'STANDBY' && grade === 'F' ? 'STANDBY' : grade,
        reason,
        quarter,
        phase_valid,
        context_valid,
        target_valid,
        score,
        checks,
        directionBias,
        htfAgreement,
        ltfAgreement,
        supplyDemand,
        quarterProfile,
        rrEvaluation,
        enforcementNotes,
        executionSummary: [
            quarterProfile.recommendedStrategy,
            rrEvaluation.message,
            `DXY confirmation is ${form.dxy.aligned === YES ? 'aligned' : 'not aligned'}.`,
        ],
        historicalMatches,
        riskReward,
    }
}

export function findHistoricalMatches(
    trades: ComparableTrade[],
    criteria: {
        quarter: Quarter
        directionBias: DirectionBias
        supportResistanceAligned: boolean
        supplyDemandStrong: boolean
        liquidityType: string
        trendIntent: string
    },
): HistoricalMatch[] {
    return trades
        .map((trade) => {
            const payload = trade.checklist_json || {}
            let similarity = 0
            let marketConditionParts: string[] = []

            if (payload.quarter === criteria.quarter) {
                similarity += 25
                marketConditionParts.push(criteria.quarter)
            }

            if (payload.directionBias === criteria.directionBias) {
                similarity += 25
                marketConditionParts.push(criteria.directionBias)
            }

            const noteText = String(trade.notes || '').toLowerCase()
            if (criteria.supportResistanceAligned && (noteText.includes('support') || noteText.includes('resistance'))) {
                similarity += 10
                marketConditionParts.push('S/R respected')
            }

            if (criteria.supplyDemandStrong && (noteText.includes('supply') || noteText.includes('demand'))) {
                similarity += 15
                marketConditionParts.push('S&D confluence')
            }

            if (noteText.includes(criteria.liquidityType.toLowerCase())) {
                similarity += 10
                marketConditionParts.push(criteria.liquidityType)
            }

            if (noteText.includes(criteria.trendIntent.toLowerCase())) {
                similarity += 15
                marketConditionParts.push(criteria.trendIntent)
            }

            return {
                id: trade.id,
                pair: trade.pair,
                outcome: String(trade.result || 'pending'),
                marketCondition: marketConditionParts.join(' · ') || 'Historical journal match',
                setupGrade: trade.setup_grade || 'N/A',
                similarity,
                tradeDate: trade.trade_date || trade.created_at || null,
                notes: trade.notes || null,
            }
        })
        .filter((trade) => trade.similarity >= 35)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
}
