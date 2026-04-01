export type ChecklistStatus = 'AUTHORIZED' | 'INVALID' | 'STANDBY'
export type ChecklistGrade = 'A+' | 'A' | 'A-' | 'B' | 'F' | 'STANDBY'
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type TrendBias = 'Uptrend' | 'Downtrend'
export type BinaryChoice = 'Yes' | 'No'
export type AlignmentStrength = 'Strong' | 'Moderate' | 'Weak'
export type DirectionBias = 'Bullish' | 'Bearish' | 'Neutral'
export type LiquidityType = 'Equal Highs' | 'Equal Lows' | 'Engineered Liquidity'
export type CRTTimeframe = 'Daily' | '4H' | '1H'
export type PatternConfirmation =
    | 'None'
    | 'Head & Shoulders'
    | 'Inverse Head & Shoulders'
    | 'Engulfing'
    | 'Pin Bar'
export type TradeDirectionThought = 'With Trend' | 'Counter Trend'
export type PsychologyState = 'Focused' | 'Neutral' | 'Distracted'
export type EnvironmentState = 'Clean / Quiet' | 'Distracting'
export type DxyTrend = 'Bullish' | 'Bearish' | 'Neutral'

export interface TradeQuarterProfile {
    quarter: Quarter
    focus: 'Reversal' | 'Manipulation' | 'Expansion'
    recommendedStrategy: string
    marketBehavior: string
    executionNotes: string[]
}

export interface SupplyDemandAssessment {
    alignment: AlignmentStrength
    directionBias: DirectionBias
    score: number
    notes: string[]
}

export interface RREvaluation {
    score: number
    label: string
    message: string
    shouldAvoidTrade: boolean
    moveStopToBreakevenAtOneToOne: boolean
}

export interface HistoricalMatch {
    id: string
    pair: string
    outcome: string
    marketCondition: string
    setupGrade: string
    similarity: number
    tradeDate?: string | null
    notes?: string | null
}

export interface HistoricalNewsReaction {
    title: string
    impact: string
    forecast?: string | null
    actual?: string | null
    previousBehavior: string
    historicalReactionSummary: string
    expectedBehavior: string
}

export interface TradeSetupForm {
    htfBias: {
        weekly: TrendBias
        daily: TrendBias
        h4: TrendBias
    }
    ltfBias: {
        h1: TrendBias
        m30: TrendBias
        m15: TrendBias
        m5: TrendBias
    }
    supportResistanceAligned: BinaryChoice
    supplyDemand: {
        htfPresent: BinaryChoice
        ltfPresent: BinaryChoice
        ltfCorrectionIntoHtfZone: BinaryChoice
        confluenceStrong: BinaryChoice
    }
    liquidity: {
        sweepOnLtf: BinaryChoice
        liquidityNearSl: BinaryChoice
        type: LiquidityType
    }
    bonusConfluence: {
        crtOccurred: BinaryChoice
        crtTimeframe: CRTTimeframe
        pattern: PatternConfirmation
    }
    traderIntent: {
        directionThought: TradeDirectionThought
        psychology: PsychologyState
        environment: EnvironmentState
    }
    execution: {
        tpSet: BinaryChoice
        slSet: BinaryChoice
    }
    dxy: {
        trend: DxyTrend
        aligned: BinaryChoice
    }
}

export interface ChecklistResult {
    status: ChecklistStatus
    grade: ChecklistGrade
    reason: string
    quarter: Quarter
    phase_valid: boolean
    context_valid: boolean
    target_valid: boolean
    score: number
    checks: Record<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6', number>
    directionBias?: DirectionBias
    htfAgreement?: number
    ltfAgreement?: number
    supplyDemand?: SupplyDemandAssessment
    quarterProfile?: TradeQuarterProfile
    rrEvaluation?: RREvaluation
    enforcementNotes?: string[]
    executionSummary?: string[]
    historicalMatches?: HistoricalMatch[]
    riskReward?: number
}

export interface AIAnalysisResult {
    symbol: string
    bias: 'LONG' | 'SHORT' | 'NEUTRAL'
    confidence: number
    checklistGrade: ChecklistGrade
    newsImpact: string
    economicEvents: string[]
    socialSentiment: string
    recommendedAction: 'CONFIRM' | 'WAIT' | 'INVALID'
}

export interface TradeRiskSnapshot {
    direction: 'LONG' | 'SHORT' | 'FLAT'
    slDistance: number
    tpDistance: number
    riskPercent: number
    instrumentType: 'forex' | 'metal' | 'index' | 'crypto'
}

export interface TradeEntry {
    tradeId?: string
    userId: string
    pair: string
    entry: number
    sl: number
    tp: number
    positionSize: number
    riskAmount: number
    potentialProfit: number
    riskReward: number
    checklist: ChecklistResult
    aiAnalysis: Pick<AIAnalysisResult, 'bias' | 'confidence' | 'recommendedAction'>
    result?: { pl: number; rr: number; status: 'WIN' | 'LOSS' | 'BREAKEVEN' }
    createdAt?: string
}

export interface DailySummary {
    summary_date: string
    trade_count: number
    win_count: number
    loss_count: number
    breakeven_count: number
    net_pl: number
    r_multiple: number
    win_rate: number
    top_setup: string | null
}
