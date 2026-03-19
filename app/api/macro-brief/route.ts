import { NextResponse } from 'next/server'

type Trend = 'up' | 'down' | 'range'
type SocialSentiment = 'bullish' | 'bearish' | 'mixed'
type Bias = 'Bullish' | 'Bearish' | 'Neutral'

interface Quote {
    symbol: string
    shortName?: string
    regularMarketPrice?: number
    regularMarketChangePercent?: number
    fiftyDayAverage?: number
    twoHundredDayAverage?: number
}

type MarketData = {
    dxy: { value: number; trend: Trend }
    us10y: { value: number; trend: Trend }
    us2y: { value: number; trend: Trend }
    gold_price: number
    sp500: number
    nasdaq: number
    oil_price: number
    news: string[]
    economic_events: string[]
    social_sentiment: SocialSentiment
}

interface MacroDeskReport {
    generatedAt: string
    sources: string[]
    marketData: MarketData
    macroOverview: string[]
    marketDrivers: string[]
    crossAsset: {
        gold: string[]
        indices: string[]
    }
    newsSentiment: string[]
    aiDecision: {
        goldBias: Bias
        indicesBias: Bias
        confidence: number
        reasoning: string[]
    }
    tradeImplication: {
        whatToDo: string[]
        whatToAvoid: string[]
        confirmationSignals: string[]
    }
    riskFactors: string[]
    decisionEngine: {
        checklistScore: number
        signal: 'BUY' | 'SELL' | 'WAIT' | 'NO TRADE'
        confidence: 'HIGH' | 'MEDIUM' | 'LOW'
        status: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL'
    }
    advancedEdge: {
        marketRegime: 'trending' | 'range' | 'volatile'
        conflictDetection: string
        scoreWeighting: string[]
        eventAwareness: string
    }
}

const YAHOO_SYMBOLS = [
    'DX-Y.NYB',
    '^TNX',
    '^IRX',
    '^GSPC',
    '^NDX',
    '^VIX',
    'GC=F',
    'CL=F',
    'EURUSD=X',
    'USDJPY=X',
]

const MARKET_DATA_USER_AGENT = process.env.MARKET_DATA_USER_AGENT || 'TradeOS/1.0 (+https://tradeos.app; contact@tradeos.app)'

const MARKET_DATA_HEADERS: HeadersInit = {
    'User-Agent': MARKET_DATA_USER_AGENT,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    } finally {
        clearTimeout(timeout)
    }
}

function fmtPct(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function fmtNum(value?: number, decimals = 2): string {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
    return value.toFixed(decimals)
}

function parseRssTitles(xml: string, limit = 5): string[] {
    const titles = Array.from(xml.matchAll(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/gi))
        .map((match) => (match[1] || match[2] || '').trim())
        .filter((title) => title && !title.toLowerCase().includes('rss'))
    return titles.slice(0, limit)
}

function parseForexFactoryHighImpact(xml: string): { count: number; events: string[] } {
    const impacts = Array.from(xml.matchAll(/<impact>([\s\S]*?)<\/impact>/gi)).map((m) => (m[1] || '').trim().toLowerCase())
    const count = impacts.filter((impact) => impact.includes('high')).length
    const events = parseRssTitles(xml, 8)
    return { count, events }
}

function trendByAverages(price?: number, ma50?: number, ma200?: number): Trend {
    if (!price || !ma50 || !ma200) return 'range'
    if (price > ma50 && ma50 > ma200) return 'up'
    if (price < ma50 && ma50 < ma200) return 'down'
    return 'range'
}

function safeQuote(quotes: Quote[], symbol: string): Quote {
    return quotes.find((q) => q.symbol === symbol) || { symbol }
}

function scoreHeadlineTone(headlines: string[]): SocialSentiment {
    const text = headlines.join(' ').toLowerCase()
    const bullishHits = ['rally', 'beat', 'optimism', 'cool inflation', 'rate cut', 'risk-on'].reduce(
        (acc, token) => acc + (text.includes(token) ? 1 : 0),
        0,
    )
    const bearishHits = ['selloff', 'geopolitical', 'inflation fear', 'hawkish', 'recession', 'risk-off'].reduce(
        (acc, token) => acc + (text.includes(token) ? 1 : 0),
        0,
    )
    if (bullishHits > bearishHits + 1) return 'bullish'
    if (bearishHits > bullishHits + 1) return 'bearish'
    return 'mixed'
}

function parseBias(value: string): Bias {
    const normalized = value.toLowerCase()
    if (normalized.includes('bull')) return 'Bullish'
    if (normalized.includes('bear')) return 'Bearish'
    return 'Neutral'
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function getFundamentalBias(data: MarketData): 'bullish_gold' | 'bearish_gold' | 'neutral' {
    if (data.dxy.trend === 'up' && data.us10y.trend === 'up') {
        return 'bearish_gold'
    }
    if (data.dxy.trend === 'down' && data.us10y.trend === 'down') {
        return 'bullish_gold'
    }
    return 'neutral'
}

function detectMarketRegime(vixValue: number, dxyTrend: Trend, us10yTrend: Trend): 'trending' | 'range' | 'volatile' {
    if (vixValue >= 20) return 'volatile'
    if (dxyTrend !== 'range' && us10yTrend !== 'range' && dxyTrend === us10yTrend) return 'trending'
    return 'range'
}

function generateSignal(score: number, bias: Bias) {
    if (score >= 8 && bias === 'Bullish') {
        return { signal: 'BUY' as const, confidence: 'HIGH' as const }
    }
    if (score >= 8 && bias === 'Bearish') {
        return { signal: 'SELL' as const, confidence: 'HIGH' as const }
    }
    if (score >= 5) {
        return { signal: 'WAIT' as const, confidence: 'MEDIUM' as const }
    }
    return { signal: 'NO TRADE' as const, confidence: 'LOW' as const }
}

function detectConflict(score: number, bias: Bias, intendedTrade?: string | null): boolean {
    if (!intendedTrade) return false
    const trade = intendedTrade.toLowerCase()
    return score >= 8 && ((bias === 'Bearish' && trade === 'buy') || (bias === 'Bullish' && trade === 'sell'))
}

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T
    } catch {
        return null
    }
}

async function runLLMReasoning(data: MarketData): Promise<{
    goldBias: Bias
    indicesBias: Bias
    confidence: number
    reasoning: string[]
} | null> {
    const prompt = `You are an institutional macro trading analyst.

Your job is to analyze financial market conditions and produce a professional trading report.

INPUT DATA:
- DXY: ${data.dxy.value} (${data.dxy.trend})
- US10Y Yield: ${data.us10y.value} (${data.us10y.trend})
- US2Y Yield: ${data.us2y.value} (${data.us2y.trend})
- Gold Price: ${data.gold_price}
- S&P500: ${data.sp500}
- Nasdaq (USTEC100): ${data.nasdaq}
- News Headlines: ${data.news.join(' | ') || 'none'}
- Economic Events: ${data.economic_events.join(' | ') || 'none'}
- Social Sentiment: ${data.social_sentiment}

Return ONLY valid JSON with this shape:
{"goldBias":"Bullish|Bearish|Neutral","indicesBias":"Bullish|Bearish|Neutral","confidence":number,"reasoning":string[]}`

    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
        const response = await fetchWithTimeout(
            endpoint,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
                }),
            },
            15000,
        )

        if (response.ok) {
            const payload = await response.json()
            const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text
            if (typeof raw === 'string') {
                const parsed = safeJsonParse<{ goldBias?: string; indicesBias?: string; confidence?: number; reasoning?: string[] }>(raw)
                if (parsed) {
                    return {
                        goldBias: parseBias(parsed.goldBias || 'Neutral'),
                        indicesBias: parseBias(parsed.indicesBias || 'Neutral'),
                        confidence: clamp(Math.round(parsed.confidence ?? 60), 0, 100),
                        reasoning: (parsed.reasoning || []).slice(0, 5),
                    }
                }
            }
        }
    }

    const deepseekKey = process.env.DEEPSEEK_API_KEY
    if (deepseekKey) {
        const response = await fetchWithTimeout(
            'https://api.deepseek.com/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${deepseekKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    temperature: 0.2,
                    messages: [
                        { role: 'system', content: 'You are an institutional macro trading analyst.' },
                        { role: 'user', content: prompt },
                    ],
                }),
            },
            15000,
        )

        if (response.ok) {
            const payload = await response.json()
            const raw = payload?.choices?.[0]?.message?.content
            if (typeof raw === 'string') {
                const parsed = safeJsonParse<{ goldBias?: string; indicesBias?: string; confidence?: number; reasoning?: string[] }>(raw)
                if (parsed) {
                    return {
                        goldBias: parseBias(parsed.goldBias || 'Neutral'),
                        indicesBias: parseBias(parsed.indicesBias || 'Neutral'),
                        confidence: clamp(Math.round(parsed.confidence ?? 60), 0, 100),
                        reasoning: (parsed.reasoning || []).slice(0, 5),
                    }
                }
            }
        }
    }

    return null
}

function buildReport(input: {
    data: MarketData
    dxyQuote: Quote
    us10yQuote: Quote
    vixQuote: Quote
    oilQuote: Quote
    ffHighImpactCount: number
    checklistScore: number
    intendedTrade?: string | null
    llmResult: { goldBias: Bias; indicesBias: Bias; confidence: number; reasoning: string[] } | null
}): MacroDeskReport {
    const {
        data,
        dxyQuote,
        us10yQuote,
        vixQuote,
        oilQuote,
        ffHighImpactCount,
        checklistScore,
        intendedTrade,
        llmResult,
    } = input

    const fundamentalBias = getFundamentalBias(data)
    const inferredGoldBias: Bias =
        fundamentalBias === 'bullish_gold' ? 'Bullish' : fundamentalBias === 'bearish_gold' ? 'Bearish' : 'Neutral'

    const inferredIndicesBias: Bias =
        data.us10y.trend === 'up' && data.dxy.trend === 'up'
            ? 'Bearish'
            : data.us10y.trend === 'down' && data.dxy.trend === 'down'
                ? 'Bullish'
                : 'Neutral'

    const fundamentalStrength = clamp(
        (Math.abs(dxyQuote.regularMarketChangePercent || 0) +
            Math.abs(us10yQuote.regularMarketChangePercent || 0) +
            Math.abs(oilQuote.regularMarketChangePercent || 0)) *
        10,
        0,
        100,
    )

    const confidence = clamp(
        Math.round(checklistScore * 0.6 * 10 + fundamentalStrength * 0.4),
        0,
        100,
    )

    const goldBias = llmResult?.goldBias || inferredGoldBias
    const indicesBias = llmResult?.indicesBias || inferredIndicesBias
    const reasoning =
        llmResult?.reasoning?.length
            ? llmResult.reasoning
            : [
                `DXY is ${data.dxy.trend} and US10Y is ${data.us10y.trend}, shaping USD and discount-rate pressure.`,
                `Oil ${fmtPct(oilQuote.regularMarketChangePercent)} signals ${oilQuote.regularMarketChangePercent && oilQuote.regularMarketChangePercent > 0 ? 'rising' : 'easing'} inflation pressure.`,
                `Risk regime is ${data.social_sentiment} with VIX at ${fmtNum(vixQuote.regularMarketPrice, 2)}.`,
                `Economic calendar carries ${ffHighImpactCount} high-impact events this week.`,
            ].slice(0, 5)

    const signalCore = generateSignal(checklistScore, goldBias)
    const conflict = detectConflict(checklistScore, goldBias, intendedTrade)
    const regime = detectMarketRegime(vixQuote.regularMarketPrice || 0, data.dxy.trend, data.us10y.trend)

    const monetaryPolicy =
        data.us10y.trend === 'up' && data.us2y.trend === 'up'
            ? 'Fed stance looks restrictive / higher-for-longer.'
            : data.us10y.trend === 'down' && data.us2y.trend === 'down'
                ? 'Rates pressure easing; policy expectations turning softer.'
                : 'Policy signal is mixed; avoid overcommitting directional risk.'

    const inflationOutlook =
        (oilQuote.regularMarketChangePercent || 0) > 0
            ? 'Inflation pressure remains sticky with higher energy prices.'
            : 'Inflation pressure is moderating as energy momentum cools.'

    const liquidityConditions =
        data.us10y.trend === 'up' ? 'Liquidity is tighter; risk assets face valuation pressure.' : 'Liquidity stress is easing versus prior sessions.'

    return {
        generatedAt: new Date().toISOString(),
        sources: [],
        marketData: data,
        macroOverview: [
            monetaryPolicy,
            inflationOutlook,
            'Geopolitical risk is elevated; keep position sizing adaptive.',
            liquidityConditions,
        ],
        marketDrivers: [
            `DXY: ${fmtNum(data.dxy.value, 2)} (${data.dxy.trend}).`,
            `US10Y: ${fmtNum(data.us10y.value, 3)} (${data.us10y.trend}) | US2Y: ${fmtNum(data.us2y.value, 3)} (${data.us2y.trend}).`,
            `Oil: ${fmtNum(data.oil_price, 2)} (${fmtPct(oilQuote.regularMarketChangePercent)}) drives inflation expectations.`,
            `Risk sentiment: ${data.social_sentiment.toUpperCase()} (${regime} regime).`,
        ],
        crossAsset: {
            gold: [
                `Gold bias: ${goldBias}.`,
                `Linkage: DXY ${data.dxy.trend} + yields ${data.us10y.trend} => ${goldBias === 'Bearish' ? 'headwind' : goldBias === 'Bullish' ? 'support' : 'mixed'} for XAUUSD.`,
                `Inflation link: oil move suggests ${inflationOutlook.toLowerCase()}`,
            ],
            indices: [
                `Indices bias: ${indicesBias}.`,
                `S&P500 ${fmtNum(data.sp500, 2)} / Nasdaq ${fmtNum(data.nasdaq, 2)} with ${data.us10y.trend} yields imply ${indicesBias === 'Bearish' ? 'valuation pressure' : 'breathing room'}.`,
                'Earnings and rate expectations remain key directional filters.',
            ],
        },
        newsSentiment: [
            `High-impact events (ForexFactory): ${ffHighImpactCount}.`,
            `Institutional tone (Reuters/MarketWatch): ${data.news.slice(0, 2).join(' | ') || 'No fresh headlines.'}`,
            `Social sentiment (Reddit proxy): ${data.social_sentiment}. Use as confirmation only.`,
        ],
        aiDecision: {
            goldBias,
            indicesBias,
            confidence: llmResult?.confidence ?? confidence,
            reasoning,
        },
        tradeImplication: {
            whatToDo: [
                `${signalCore.signal} bias only when checklist score and macro bias are aligned.`,
                'Wait for pullback/structure confirmation before trigger.',
            ],
            whatToAvoid: [
                'Avoid fresh entries 15–30 minutes before high-impact events.',
                'Avoid trading against DXY + yield alignment without clear invalidation.',
            ],
            confirmationSignals: [
                'DXY and yields confirming your direction.',
                'Price acceptance at planned supply/demand zone.',
                'Risk sentiment not diverging against setup.',
            ],
        },
        riskFactors: [
            `Upcoming high-impact events: ${ffHighImpactCount}.`,
            'Potential liquidity sweep near session opens/news releases.',
            'Reversal risk if DXY and yields diverge suddenly.',
        ],
        decisionEngine: {
            checklistScore,
            signal: signalCore.signal,
            confidence: signalCore.confidence,
            status: conflict ? 'CONFLICT' : signalCore.signal === 'WAIT' || signalCore.signal === 'NO TRADE' ? 'NEUTRAL' : 'ALIGNED',
        },
        advancedEdge: {
            marketRegime: regime,
            conflictDetection: conflict
                ? 'Conflict detected: setup intent opposes macro + score logic.'
                : 'No conflict detected between score, bias, and intended direction.',
            scoreWeighting: [
                'Confidence = (checklistScore * 0.6) + (fundamentalStrength * 0.4).',
                'High volatility regime reduces expected RR and position size.',
                'Strong DXY regime reduces gold long conviction.',
            ],
            eventAwareness: ffHighImpactCount > 0
                ? 'Event risk active: reduce confidence and wait for post-release confirmation.'
                : 'No major event cluster detected; normal execution protocol.',
        },
    }
}

export async function GET(request: Request) {
    try {
        const sources: string[] = []
        const url = new URL(request.url)
        const checklistScore = clamp(Number(url.searchParams.get('score') || 7), 0, 10)
        const intendedTrade = url.searchParams.get('trade')

        const [quoteRes, ffRes, investingRes, reutersRes, marketWatchRes, redditRes] = await Promise.allSettled([
            fetchWithTimeout(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(YAHOO_SYMBOLS.join(','))}`, {
                headers: MARKET_DATA_HEADERS,
            }),
            fetchWithTimeout('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
                headers: MARKET_DATA_HEADERS,
            }),
            fetchWithTimeout('https://www.investing.com/rss/news_25.rss', {
                headers: MARKET_DATA_HEADERS,
            }),
            fetchWithTimeout('https://feeds.reuters.com/reuters/businessNews', {
                headers: MARKET_DATA_HEADERS,
            }),
            fetchWithTimeout('https://feeds.marketwatch.com/marketwatch/topstories/', {
                headers: MARKET_DATA_HEADERS,
            }),
            fetchWithTimeout('https://www.reddit.com/r/investing/.rss', {
                headers: MARKET_DATA_HEADERS,
            }),
        ])

        let quotes: Quote[] = []
        let ffHighImpactCount = 0
        let ffEvents: string[] = []
        let investingTitles: string[] = []
        let reutersTitles: string[] = []
        let marketWatchTitles: string[] = []
        let socialTitles: string[] = []

        if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
            const payload = await quoteRes.value.json()
            quotes = (payload?.quoteResponse?.result || []) as Quote[]
            sources.push('Yahoo Finance')
        }

        if (ffRes.status === 'fulfilled' && ffRes.value.ok) {
            const xml = await ffRes.value.text()
            const parsed = parseForexFactoryHighImpact(xml)
            ffHighImpactCount = parsed.count
            ffEvents = parsed.events
            sources.push('Forex Factory')
        }

        if (investingRes.status === 'fulfilled' && investingRes.value.ok) {
            const xml = await investingRes.value.text()
            investingTitles = parseRssTitles(xml, 5)
            sources.push('Investing.com')
        }

        if (reutersRes.status === 'fulfilled' && reutersRes.value.ok) {
            const xml = await reutersRes.value.text()
            reutersTitles = parseRssTitles(xml, 5)
            sources.push('Reuters')
        }

        if (marketWatchRes.status === 'fulfilled' && marketWatchRes.value.ok) {
            const xml = await marketWatchRes.value.text()
            marketWatchTitles = parseRssTitles(xml, 4)
            sources.push('MarketWatch')
        }

        if (redditRes.status === 'fulfilled' && redditRes.value.ok) {
            const xml = await redditRes.value.text()
            socialTitles = parseRssTitles(xml, 5)
            sources.push('Reddit')
        }

        const dxy = safeQuote(quotes, 'DX-Y.NYB')
        const us10y = safeQuote(quotes, '^TNX')
        const us2y = safeQuote(quotes, '^IRX')
        const gold = safeQuote(quotes, 'GC=F')
        const spx = safeQuote(quotes, '^GSPC')
        const ndx = safeQuote(quotes, '^NDX')
        const oil = safeQuote(quotes, 'CL=F')
        const vix = safeQuote(quotes, '^VIX')

        const allHeadlines = [...investingTitles, ...reutersTitles, ...marketWatchTitles]
        const socialSentiment = scoreHeadlineTone(socialTitles)

        const marketData: MarketData = {
            dxy: {
                value: dxy.regularMarketPrice || 0,
                trend: trendByAverages(dxy.regularMarketPrice, dxy.fiftyDayAverage, dxy.twoHundredDayAverage),
            },
            us10y: {
                value: us10y.regularMarketPrice || 0,
                trend: trendByAverages(us10y.regularMarketPrice, us10y.fiftyDayAverage, us10y.twoHundredDayAverage),
            },
            us2y: {
                value: us2y.regularMarketPrice || 0,
                trend: trendByAverages(us2y.regularMarketPrice, us2y.fiftyDayAverage, us2y.twoHundredDayAverage),
            },
            gold_price: gold.regularMarketPrice || 0,
            sp500: spx.regularMarketPrice || 0,
            nasdaq: ndx.regularMarketPrice || 0,
            oil_price: oil.regularMarketPrice || 0,
            news: allHeadlines.slice(0, 8),
            economic_events: ffEvents.slice(0, 8),
            social_sentiment: socialSentiment,
        }

        const llmResult = await runLLMReasoning(marketData)
        const report = buildReport({
            data: marketData,
            dxyQuote: dxy,
            us10yQuote: us10y,
            vixQuote: vix,
            oilQuote: oil,
            ffHighImpactCount,
            checklistScore,
            intendedTrade,
            llmResult,
        })

        report.sources = sources.length > 0 ? sources : ['Heuristic Fallback']

        return NextResponse.json({ result: report })
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to generate trading analysis.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        )
    }
}
