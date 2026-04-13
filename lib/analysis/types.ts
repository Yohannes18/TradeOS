export type AnalysisBias = 'bullish' | 'bearish' | 'neutral'

export interface MarketStateContext {
    pair?: string
    timeframe?: AnalysisInput['timeframe']
    regime?: string
    summary?: string
    keyDrivers?: string[]
    riskFlags?: string[]
}

export interface PreTradeContext {
    verdict?: string
    score?: number
    bias?: AnalysisBias
    entry?: string | number
    stopLoss?: string | number
    takeProfit?: string | number
    riskPercent?: string | number
}

export interface ExecutionContext {
    status?: string
    entry?: string | number
    stopLoss?: string | number
    takeProfit?: string | number
    positionSize?: string | number
    closePrice?: string | number | null
}

export interface RiskContext {
    accountBalance?: string | number
    riskPercent?: string | number
    riskScore?: number
    rrRatio?: number
    maxLoss?: string | number
}

export interface NewsContextArticle {
    title: string
    source: string
    summary?: string
    publishedAt?: string | Date
    sentiment?: 'positive' | 'negative' | 'neutral'
    relevanceScore?: number
}

export interface NewsContext {
    items: NewsContextArticle[]
}

export interface AnalysisPromptContext {
    marketState?: MarketStateContext
    preTrade?: PreTradeContext
    execution?: ExecutionContext
    risk?: RiskContext
    news?: NewsContext
}

export interface AnalysisInput {
    pair: string
    timeframe: 'scalp' | 'intraday' | 'swing' | 'position'
    notes?: string
    manualBias?: AnalysisBias
    context?: AnalysisPromptContext
}

export interface AnalysisResult {
    recommendedBias: AnalysisBias
    confidence: number
    summary: string
    keyDrivers: string[]
    riskFlags: string[]
    providersUsed: string[]
    macroScore: {
        bullish: number
        bearish: number
    }
    fundamentalScore: {
        bullish: number
        bearish: number
    }
}

export class AnalysisProviderError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AnalysisProviderError'
    }
}
