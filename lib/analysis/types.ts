export type AnalysisBias = 'bullish' | 'bearish' | 'neutral'

export interface AnalysisInput {
    pair: string
    timeframe: 'scalp' | 'intraday' | 'swing' | 'position'
    notes?: string
    manualBias?: AnalysisBias
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
