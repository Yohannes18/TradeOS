import { NextResponse } from 'next/server'

interface Quote {
    symbol: string
    shortName?: string
    regularMarketPrice?: number
    regularMarketChangePercent?: number
    fiftyDayAverage?: number
    twoHundredDayAverage?: number
}

interface MacroBriefResponse {
    generatedAt: string
    sources: string[]
    daily: string[]
    weekly: string[]
    monthly: string[]
    strategy: string[]
    keyLevels: string[]
}

const YAHOO_SYMBOLS = [
    'DX-Y.NYB',
    '^TNX',
    '^GSPC',
    '^VIX',
    'GC=F',
    'CL=F',
    'EURUSD=X',
    'GBPUSD=X',
    'USDJPY=X',
    'BTC-USD',
]

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    } finally {
        clearTimeout(timeout)
    }
}

function fmtPct(value?: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function fmtNum(value?: number, decimals = 2) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
    return value.toFixed(decimals)
}

function parseRssTitles(xml: string, limit = 5): string[] {
    const titles = Array.from(xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gis))
        .map((match) => (match[1] || match[2] || '').trim())
        .filter((title) => title && !title.toLowerCase().includes('rss'))
    return titles.slice(0, limit)
}

function parseForexFactoryHighImpactCount(xml: string): number {
    const impacts = Array.from(xml.matchAll(/<impact>(.*?)<\/impact>/gis)).map((m) => (m[1] || '').trim().toLowerCase())
    return impacts.filter((impact) => impact.includes('high')).length
}

function trendByAverages(price?: number, ma50?: number, ma200?: number): 'bullish' | 'bearish' | 'neutral' {
    if (!price || !ma50 || !ma200) return 'neutral'
    if (price > ma50 && ma50 > ma200) return 'bullish'
    if (price < ma50 && ma50 < ma200) return 'bearish'
    return 'neutral'
}

function safeQuote(quotes: Quote[], symbol: string): Quote {
    return quotes.find((q) => q.symbol === symbol) || { symbol }
}

function generateMacroBrief(
    quotes: Quote[],
    forexFactoryHighImpact: number,
    investingTitles: string[],
    reutersTitles: string[],
): MacroBriefResponse {
    const dxy = safeQuote(quotes, 'DX-Y.NYB')
    const us10y = safeQuote(quotes, '^TNX')
    const spx = safeQuote(quotes, '^GSPC')
    const vix = safeQuote(quotes, '^VIX')
    const gold = safeQuote(quotes, 'GC=F')
    const oil = safeQuote(quotes, 'CL=F')
    const eurusd = safeQuote(quotes, 'EURUSD=X')
    const usdjpy = safeQuote(quotes, 'USDJPY=X')

    const usdImpulse = (dxy.regularMarketChangePercent || 0) + (us10y.regularMarketChangePercent || 0)
    const riskImpulse = (spx.regularMarketChangePercent || 0) - (vix.regularMarketChangePercent || 0)

    const daily: string[] = [
        `DXY ${fmtPct(dxy.regularMarketChangePercent)} + US10Y ${fmtPct(us10y.regularMarketChangePercent)} => ${usdImpulse >= 0 ? 'USD support' : 'USD softness'}.`,
        `S&P500 ${fmtPct(spx.regularMarketChangePercent)} vs VIX ${fmtPct(vix.regularMarketChangePercent)} => ${riskImpulse >= 0 ? 'risk-on' : 'risk-off'}.`,
        `Gold ${fmtPct(gold.regularMarketChangePercent)} + Oil ${fmtPct(oil.regularMarketChangePercent)} => ${((gold.regularMarketChangePercent || 0) + (oil.regularMarketChangePercent || 0)) >= 0 ? 'inflation pressure up' : 'inflation pressure easing'}.`,
    ]

    const dxyWeeklyTrend = trendByAverages(dxy.regularMarketPrice, dxy.fiftyDayAverage, dxy.twoHundredDayAverage)
    const us10yWeeklyTrend = trendByAverages(us10y.regularMarketPrice, us10y.fiftyDayAverage, us10y.twoHundredDayAverage)
    const spxWeeklyTrend = trendByAverages(spx.regularMarketPrice, spx.fiftyDayAverage, spx.twoHundredDayAverage)

    const weekly: string[] = [
        `DXY trend: ${dxyWeeklyTrend.toUpperCase()} (P ${fmtNum(dxy.regularMarketPrice)} / 50DMA ${fmtNum(dxy.fiftyDayAverage)}).`,
        `US10Y trend: ${us10yWeeklyTrend.toUpperCase()} (Y ${fmtNum(us10y.regularMarketPrice, 3)} / 50DMA ${fmtNum(us10y.fiftyDayAverage, 3)}).`,
        `S&P500 regime: ${spxWeeklyTrend.toUpperCase()} => ${spxWeeklyTrend === 'bearish' ? 'defensive FX bias' : 'risk currencies can stay supported'}.`,
    ]

    const monthlyBiasScore =
        (trendByAverages(dxy.fiftyDayAverage, dxy.fiftyDayAverage, dxy.twoHundredDayAverage) === 'bullish' ? 1 : -1) +
        (trendByAverages(us10y.fiftyDayAverage, us10y.fiftyDayAverage, us10y.twoHundredDayAverage) === 'bullish' ? 1 : -1) +
        (trendByAverages(spx.fiftyDayAverage, spx.fiftyDayAverage, spx.twoHundredDayAverage) === 'bullish' ? 1 : -1)

    const monthlyBias = monthlyBiasScore >= 1 ? 'pro-USD / selective risk-on' : monthlyBiasScore <= -1 ? 'USD mean-reversion / risk-fragile' : 'range-to-rotation'

    const monthly: string[] = [
        `Regime bias: ${monthlyBias}.`,
        `Calendar risk (Forex Factory): ${forexFactoryHighImpact} high-impact events this week.`,
        `Cross-check: EURUSD ${fmtNum(eurusd.regularMarketPrice, 4)} + USDJPY ${fmtNum(usdjpy.regularMarketPrice, 3)} for USD thesis confirmation.`,
    ]

    const strategy: string[] = [
        `Sequence: USD/yield -> risk regime -> pair structure.`,
        `DXY + US10Y aligned: favor long-USD; diverging: cut size and wait.`,
        `Avoid fresh entries 15-30m before high-impact releases unless pre-planned.`,
        `Only execute when macro bias and checklist align.`,
    ]

    const newsBullets = [...investingTitles.slice(0, 2), ...reutersTitles.slice(0, 2)].map((title) => `Watch: ${title}`)
    const keyLevels: string[] = [
        `DXY ${fmtNum(dxy.regularMarketPrice)} | US10Y ${fmtNum(us10y.regularMarketPrice, 3)} | VIX ${fmtNum(vix.regularMarketPrice, 2)}`,
        ...newsBullets,
    ]

    return {
        generatedAt: new Date().toISOString(),
        sources: ['Yahoo Finance', 'Forex Factory', 'Investing.com', 'Reuters'],
        daily,
        weekly,
        monthly,
        strategy,
        keyLevels,
    }
}

export async function GET() {
    try {
        const sources: string[] = []

        const [quoteRes, ffRes, investingRes, reutersRes] = await Promise.allSettled([
            fetchWithTimeout(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(YAHOO_SYMBOLS.join(','))}`, {
                headers: { 'User-Agent': 'TradeOS/1.0' },
            }),
            fetchWithTimeout('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
                headers: { 'User-Agent': 'TradeOS/1.0' },
            }),
            fetchWithTimeout('https://www.investing.com/rss/news_25.rss', {
                headers: { 'User-Agent': 'TradeOS/1.0' },
            }),
            fetchWithTimeout('https://feeds.reuters.com/reuters/businessNews', {
                headers: { 'User-Agent': 'TradeOS/1.0' },
            }),
        ])

        let quotes: Quote[] = []
        let forexFactoryHighImpact = 0
        let investingTitles: string[] = []
        let reutersTitles: string[] = []

        if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
            const payload = await quoteRes.value.json()
            quotes = (payload?.quoteResponse?.result || []) as Quote[]
            sources.push('Yahoo Finance')
        }

        if (ffRes.status === 'fulfilled' && ffRes.value.ok) {
            const xml = await ffRes.value.text()
            forexFactoryHighImpact = parseForexFactoryHighImpactCount(xml)
            sources.push('Forex Factory')
        }

        if (investingRes.status === 'fulfilled' && investingRes.value.ok) {
            const xml = await investingRes.value.text()
            investingTitles = parseRssTitles(xml, 4)
            sources.push('Investing.com')
        }

        if (reutersRes.status === 'fulfilled' && reutersRes.value.ok) {
            const xml = await reutersRes.value.text()
            reutersTitles = parseRssTitles(xml, 4)
            sources.push('Reuters')
        }

        const result = generateMacroBrief(quotes, forexFactoryHighImpact, investingTitles, reutersTitles)
        result.sources = sources.length > 0 ? sources : ['Heuristic Fallback']

        return NextResponse.json({ result })
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
