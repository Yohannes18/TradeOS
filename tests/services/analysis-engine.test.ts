import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAnalysisPrompt, runAutoAnalysis } from '@/lib/analysis/engine'

const originalGeminiKey = process.env.GEMINI_API_KEY
const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY
const originalFetch = global.fetch

afterEach(() => {
    process.env.GEMINI_API_KEY = originalGeminiKey
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey
    global.fetch = originalFetch
    vi.restoreAllMocks()
})

describe('runAutoAnalysis', () => {
    it('builds a structured JSON-only prompt with all context sections', () => {
        const prompt = buildAnalysisPrompt(
            {
                pair: 'XAUUSD',
                timeframe: 'intraday',
                notes: 'risk-off and elevated volatility',
                manualBias: 'bullish',
                context: {
                    marketState: {
                        pair: 'XAUUSD',
                        timeframe: 'intraday',
                        regime: 'trend',
                        summary: 'Dollar softness with safe-haven demand.',
                        keyDrivers: ['Dovish repricing'],
                        riskFlags: ['Event risk'],
                    },
                    preTrade: {
                        verdict: 'AUTHORIZED',
                        score: 87,
                        bias: 'bullish',
                        entry: 2345.1,
                        stopLoss: 2338.4,
                        takeProfit: 2361.2,
                        riskPercent: 1,
                    },
                    execution: {
                        status: 'executed',
                        entry: 2345.1,
                        stopLoss: 2338.4,
                        takeProfit: 2361.2,
                        positionSize: 1.5,
                    },
                    risk: {
                        accountBalance: 10000,
                        riskPercent: 1,
                        riskScore: 72,
                        rrRatio: 2.4,
                        maxLoss: 100,
                    },
                },
            },
            {
                recommendedBias: 'bullish',
                confidence: 76,
                summary: 'Baseline summary',
                keyDrivers: ['Baseline driver'],
                riskFlags: ['Baseline risk'],
                providersUsed: ['heuristic'],
                macroScore: { bullish: 3, bearish: 1 },
                fundamentalScore: { bullish: 2, bearish: 1 },
            },
        )

        expect(prompt).toContain('Return JSON only. Do not include markdown, commentary, or additional keys.')
        expect(prompt).toContain('{"bias":"bullish|bearish|neutral","confidence":number,"key_levels":[],"reasoning":string,"risk_score":number}')
        expect(prompt).toContain('Market State')
        expect(prompt).toContain('PreTrade Data')
        expect(prompt).toContain('Execution Context')
        expect(prompt).toContain('Risk Parameters')
        expect(prompt).toContain('Dollar softness with safe-haven demand.')
        expect(prompt).toContain('risk_score')
    })

    it('filters low-signal news before adding it to the prompt', () => {
        const prompt = buildAnalysisPrompt(
            {
                pair: 'XAUUSD',
                timeframe: 'intraday',
                notes: 'Gold reacting to yields and dollar moves',
                manualBias: 'bullish',
                context: {
                    news: {
                        items: [
                            {
                                title: 'Fed signals higher for longer as inflation stays sticky',
                                source: 'Reuters',
                                relevanceScore: 96,
                            },
                            {
                                title: 'Gold climbs as yields retreat and dollar softens',
                                source: 'Bloomberg',
                                relevanceScore: 91,
                            },
                            {
                                title: 'Local market recap: equities drift in thin trade',
                                source: 'Generic Feed',
                                relevanceScore: 8,
                            },
                        ],
                    },
                },
            },
            {
                recommendedBias: 'bullish',
                confidence: 70,
                summary: 'Baseline summary',
                keyDrivers: ['Baseline driver'],
                riskFlags: ['Baseline risk'],
                providersUsed: ['heuristic'],
                macroScore: { bullish: 3, bearish: 1 },
                fundamentalScore: { bullish: 2, bearish: 1 },
            },
        )

        expect(prompt).toContain('News Context')
        expect(prompt).toContain('Fed signals higher for longer as inflation stays sticky')
        expect(prompt).toContain('Gold climbs as yields retreat and dollar softens')
        expect(prompt).not.toContain('Local market recap: equities drift in thin trade')
        expect(prompt).toContain('cite the most relevant headline or source')
    })

    it('returns deterministic fallback when no provider is configured', async () => {
        delete process.env.GEMINI_API_KEY
        delete process.env.DEEPSEEK_API_KEY

        const result = await runAutoAnalysis({
            pair: 'XAUUSD',
            timeframe: 'intraday',
            notes: 'risk-off with geopolitical stress',
            manualBias: 'neutral',
        })

        expect(result.providersUsed).toEqual(['heuristic'])
        expect(result.riskFlags).toContain('Live AI response unavailable, using deterministic fallback.')
    })

    it('falls back when provider responds with malformed payload', async () => {
        process.env.GEMINI_API_KEY = 'test-key'
        delete process.env.DEEPSEEK_API_KEY

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'not valid json' }] } }],
            }),
        } as Response)

        const result = await runAutoAnalysis({
            pair: 'EURUSD',
            timeframe: 'intraday',
            notes: 'dovish tone but mixed jobs data',
            manualBias: 'neutral',
        })

        expect(result.providersUsed).toEqual(['heuristic'])
        expect(result.riskFlags).toContain('Live AI response unavailable, using deterministic fallback.')
    })

    it('parses provider response from fenced JSON and merges output', async () => {
        process.env.GEMINI_API_KEY = 'test-key'
        delete process.env.DEEPSEEK_API_KEY

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: '```json\n{"bias":"bullish","confidence":88,"key_levels":["2345.20","2361.80"],"reasoning":"Bullish macro-fundamental alignment.","risk_score":31}\n```',
                                },
                            ],
                        },
                    },
                ],
            }),
        } as Response)

        const result = await runAutoAnalysis({
            pair: 'BTCUSD',
            timeframe: 'intraday',
            notes: 'risk-on and easing narrative',
            manualBias: 'bullish',
        })

        expect(result.providersUsed).toContain('gemini')
        expect(result.recommendedBias).toBe('bullish')
        expect(result.confidence).toBeGreaterThan(0)
        expect(result.summary).toContain('gemini: Bullish macro-fundamental alignment.')
        expect(result.keyDrivers.length).toBeGreaterThan(0)
    })

    it('reuses the last successful analysis when providers fail on the same input', async () => {
        process.env.GEMINI_API_KEY = 'test-key'
        delete process.env.DEEPSEEK_API_KEY

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: '{"bias":"bullish","confidence":91,"key_levels":["2348.10"],"reasoning":"Fed tone and gold support remain constructive.","risk_score":22}',
                                },
                            ],
                        },
                    },
                ],
            }),
        } as Response)

        const input = {
            pair: 'XAUUSD',
            timeframe: 'intraday' as const,
            notes: 'Gold reacting to yields and dollar moves',
            manualBias: 'bullish' as const,
            context: {
                news: {
                    items: [
                        {
                            title: 'Gold climbs as yields retreat and dollar softens',
                            source: 'Bloomberg',
                            relevanceScore: 94,
                        },
                    ],
                },
            },
        }

        const first = await runAutoAnalysis(input)

        global.fetch = vi.fn().mockRejectedValue(new Error('provider offline'))

        const second = await runAutoAnalysis(input)

        expect(second).toEqual(first)
    })
})
