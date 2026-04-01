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

interface InvestingSnapshot {
    value: number
    change?: number
    changePercent?: number
    trend: Trend
    sourceLabel: string
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
    sourceDiagnostics?: SourceHealth[]
    cache?: {
        mode: 'fresh' | 'warm'
        fetchedAt: string
        expiresAt: string
    }
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
        marketRegime: 'trending' | 'range'
        conflictDetection: string
        scoreWeighting: string[]
        eventAwareness: string
    }
}

type SourceHealth = {
    label: string
    status: 'ok' | 'blocked' | 'empty' | 'error'
}

type MacroSourceBundle = {
    fetchedAt: string
    expiresAt: string
    sources: string[]
    sourceDiagnostics: SourceHealth[]
    quotes: Quote[]
    ffHighImpactCount: number
    ffEvents: string[]
    investingTitles: string[]
    myfxbookTitles: string[]
    alphaVantageTitles: string[]
    finnhubTitles: string[]
    xTitles: string[]
    socialTitles: string[]
    investingSnapshots: Partial<Record<keyof typeof INVESTING_MARKET_ENDPOINTS, InvestingSnapshot | null>>
}

type ReportCacheEntry = {
    fetchedAt: string
    expiresAt: string
    report: MacroDeskReport
}

const YAHOO_SYMBOLS = [
    'DX-Y.NYB',
    '^TNX',
    '^GSPC',
    '^NDX',
    'GC=F',
    'CL=F',
]

const INVESTING_MARKET_ENDPOINTS = {
    dxy: {
        url: 'https://www.investing.com/currencies/us-dollar-index',
        sourceLabel: 'Investing.com DXY',
    },
    us10y: {
        url: 'https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield',
        sourceLabel: 'Investing.com US10Y',
    },
    us2y: {
        url: 'https://www.investing.com/rates-bonds/u.s.-2-year-bond-yield',
        sourceLabel: 'Investing.com US2Y',
    },
    sp500: {
        url: 'https://www.investing.com/indices/us-spx-500',
        sourceLabel: 'Investing.com S&P 500',
    },
    nasdaq: {
        url: 'https://www.investing.com/indices/nq-100',
        sourceLabel: 'Investing.com USTEC100',
    },
    gold: {
        url: 'https://www.investing.com/commodities/gold',
        sourceLabel: 'Investing.com Gold',
    },
    oil: {
        url: 'https://www.investing.com/commodities/crude-oil',
        sourceLabel: 'Investing.com Crude Oil',
    },
} as const

const MARKET_DATA_USER_AGENT =
    process.env.MARKET_DATA_USER_AGENT ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY?.trim()
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY?.trim()
const DEFAULT_X_NEWS_RSS_URLS = [
    'https://nitter.net/search/rss?f=tweets&q=macro%20markets%20stocks',
    'https://nitter.net/search/rss?f=tweets&q=stock%20market%20news',
]
const X_NEWS_RSS_URLS = (process.env.X_NEWS_RSS_URL || DEFAULT_X_NEWS_RSS_URLS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

function parseNonNegativeEnvNumber(rawValue: string | undefined, fallback: number): number {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed) || parsed < 0) return fallback
    return parsed
}

const CONFIDENCE_WEIGHTS = (() => {
    const defaults = {
        checklist: 0.5,
        macro: 0.3,
        indexMomentum: 0.2,
    }

    const raw = {
        checklist: parseNonNegativeEnvNumber(process.env.MACRO_CONFIDENCE_CHECKLIST_WEIGHT, defaults.checklist),
        macro: parseNonNegativeEnvNumber(process.env.MACRO_CONFIDENCE_MACRO_WEIGHT, defaults.macro),
        indexMomentum: parseNonNegativeEnvNumber(process.env.MACRO_CONFIDENCE_INDEX_WEIGHT, defaults.indexMomentum),
    }

    const total = raw.checklist + raw.macro + raw.indexMomentum
    if (total <= 0) return defaults

    return {
        checklist: raw.checklist / total,
        macro: raw.macro / total,
        indexMomentum: raw.indexMomentum / total,
    }
})()

const BROWSER_NAV_HEADERS: HeadersInit = {
    'User-Agent': MARKET_DATA_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    DNT: '1',
    'Sec-CH-UA': '"Google Chrome";v="145", "Chromium";v="145", "Not.A/Brand";v="24"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Linux"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

const RSS_HEADERS: HeadersInit = {
    'User-Agent': MARKET_DATA_USER_AGENT,
    Accept: 'application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
}

const SOURCE_CACHE_TTL_MS = 5 * 60 * 1000
const REPORT_CACHE_TTL_MS = 90 * 1000
const sourceCache = new Map<string, MacroSourceBundle>()
const reportCache = new Map<string, ReportCacheEntry>()
const inflightSourceFetches = new Map<string, Promise<MacroSourceBundle>>()
const inflightReportFetches = new Map<string, Promise<ReportCacheEntry>>()

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    } finally {
        clearTimeout(timeout)
    }
}

function headersWithReferer(
    baseHeaders: HeadersInit,
    referer: string,
    origin?: string,
    secFetchSite: 'none' | 'same-origin' | 'cross-site' = 'cross-site',
): HeadersInit {
    return {
        ...baseHeaders,
        Referer: referer,
        ...(origin ? { Origin: origin } : {}),
        'Sec-Fetch-Site': secFetchSite,
    }
}

function fmtPct(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function normalizeNumericString(value?: string | null): number | null {
    if (!value) return null
    const normalized = value
        .replace(/&nbsp;/g, '')
        .replace(/,/g, '')
        .replace(/[()%+]/g, '')
        .trim()

    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
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

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

function parseHtmlTitles(html: string, limit = 8): string[] {
    const titles = Array.from(html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>|<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>/gi))
        .map((match) => decodeHtmlEntities((match[1] || match[2] || match[3] || '').replace(/<[^>]+>/g, '').trim()))
        .filter((title) => title.length > 20)
    return Array.from(new Set(titles)).slice(0, limit)
}

function uniqueNonEmptyTitles(titles: string[], limit = 8): string[] {
    return Array.from(new Set(titles.map((title) => title.trim()).filter((title) => title.length > 12))).slice(0, limit)
}

async function fetchAlphaVantageNews(limit = 8): Promise<{ titles: string[]; health: SourceHealth }> {
    const label = 'Alpha Vantage News'
    if (!ALPHA_VANTAGE_API_KEY) {
        return { titles: [], health: { label, status: 'error' } }
    }

    try {
        const endpoint =
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=financial_markets` +
            `&sort=LATEST&limit=${encodeURIComponent(String(limit))}&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`

        const response = await fetchWithTimeout(
            endpoint,
            {
                headers: {
                    Accept: 'application/json,text/plain,*/*',
                    'User-Agent': MARKET_DATA_USER_AGENT,
                },
            },
            12000,
        )

        if (!response.ok) {
            return { titles: [], health: { label, status: 'error' } }
        }

        const payload = await response.json()
        const rawTitles = Array.isArray(payload?.feed)
            ? payload.feed.map((item: { title?: unknown }) => (typeof item?.title === 'string' ? item.title : ''))
            : []

        const titles = uniqueNonEmptyTitles(rawTitles, limit)
        return {
            titles,
            health: { label, status: titles.length > 0 ? 'ok' : 'empty' },
        }
    } catch {
        return { titles: [], health: { label, status: 'error' } }
    }
}

async function fetchFinnhubNews(limit = 8): Promise<{ titles: string[]; health: SourceHealth }> {
    const label = 'Finnhub News'
    if (!FINNHUB_API_KEY) {
        return { titles: [], health: { label, status: 'error' } }
    }

    try {
        const endpoint = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(FINNHUB_API_KEY)}`
        const response = await fetchWithTimeout(
            endpoint,
            {
                headers: {
                    Accept: 'application/json,text/plain,*/*',
                    'User-Agent': MARKET_DATA_USER_AGENT,
                },
            },
            12000,
        )

        if (!response.ok) {
            return { titles: [], health: { label, status: 'error' } }
        }

        const payload = await response.json()
        const rawTitles = Array.isArray(payload)
            ? payload.map((item: { headline?: unknown }) => (typeof item?.headline === 'string' ? item.headline : ''))
            : []

        const titles = uniqueNonEmptyTitles(rawTitles, limit)
        return {
            titles,
            health: { label, status: titles.length > 0 ? 'ok' : 'empty' },
        }
    } catch {
        return { titles: [], health: { label, status: 'error' } }
    }
}

function looksBlockedHtml(html: string): boolean {
    const normalized = html.toLowerCase()
    return (
        normalized.includes('attention required') ||
        normalized.includes('please enable js') ||
        normalized.includes('are you a robot') ||
        normalized.includes('captcha') ||
        normalized.includes('cloudflare')
    )
}

function selectRelevantHeadlines(headlines: string[], limit = 10): string[] {
    const keywords = [
        'xauusd', 'gold', 'bullion', 'dollar', 'dxy', 'usd', 'treasury', 'yield', 'yields',
        'nasdaq', 's&p', 'sp500', 'wall street', 'stocks', 'equity', 'fed', 'fomc', 'ecb',
        'boj', 'rates', 'inflation', 'nfp', 'cpi', 'pce', 'eurusd', 'gbpusd', 'usdjpy', 'risk',
    ]

    const ranked = headlines
        .map((headline) => ({
            headline,
            score: keywords.reduce((acc, keyword) => acc + (headline.toLowerCase().includes(keyword) ? 1 : 0), 0),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.headline)

    const fallback = headlines.filter((headline) => headline.length > 20)
    return Array.from(new Set([...ranked, ...fallback])).slice(0, limit)
}

async function fetchHeadlineSource(
    label: string,
    url: string,
    mode: 'rss' | 'html' = 'rss',
    limit = 5,
): Promise<{ titles: string[]; health: SourceHealth }> {
    try {
        let headers: HeadersInit

        if (mode === 'rss') {
            if (url.includes('myfxbook.com')) {
                headers = headersWithReferer(RSS_HEADERS, 'https://www.myfxbook.com/', 'https://www.myfxbook.com')
            } else if (url.includes('reddit.com')) {
                headers = headersWithReferer(RSS_HEADERS, 'https://www.reddit.com/', 'https://www.reddit.com')
            } else if (url.includes('investing.com')) {
                headers = headersWithReferer(RSS_HEADERS, 'https://www.investing.com/', 'https://www.investing.com')
            } else if (url.includes('x.com') || url.includes('twitter.com') || url.includes('nitter.net') || url.includes('rsshub.app')) {
                headers = headersWithReferer(RSS_HEADERS, 'https://x.com/', 'https://x.com')
            } else {
                headers = RSS_HEADERS
            }
        } else {
            headers = BROWSER_NAV_HEADERS
        }

        const response = await fetchWithTimeout(url, { headers }, 12000)
        if (!response.ok) {
            return { titles: [], health: { label, status: 'error' } }
        }

        const body = await response.text()
        if (mode === 'html' && looksBlockedHtml(body)) {
            return { titles: [], health: { label, status: 'blocked' } }
        }

        const titles = mode === 'rss' ? parseRssTitles(body, limit) : parseHtmlTitles(body, limit)
        return {
            titles,
            health: { label, status: titles.length > 0 ? 'ok' : 'empty' },
        }
    } catch {
        return { titles: [], health: { label, status: 'error' } }
    }
}

async function fetchXFeedHeadlines(limit = 6): Promise<{ titles: string[]; health: SourceHealth }> {
    let sawBlocked = false
    let sawError = false

    for (const url of X_NEWS_RSS_URLS) {
        const result = await fetchHeadlineSource('X Feed', url, 'rss', limit)
        if (result.titles.length > 0) {
            return result
        }

        if (result.health.status === 'blocked') sawBlocked = true
        if (result.health.status === 'error') sawError = true
    }

    return {
        titles: [],
        health: {
            label: 'X Feed',
            status: sawBlocked ? 'blocked' : sawError ? 'error' : 'empty',
        },
    }
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

function trendByChangePercent(changePercent?: number | null): Trend {
    if (typeof changePercent !== 'number' || Number.isNaN(changePercent)) return 'range'
    if (changePercent >= 0.15) return 'up'
    if (changePercent <= -0.15) return 'down'
    return 'range'
}

function extractDataTestValue(html: string, testId: string): string | null {
    const pattern = new RegExp(`data-test="${testId}"[^>]*>([^<]+)`, 'i')
    const match = html.match(pattern)
    return match?.[1]?.trim() || null
}

function parseInvestingSnapshot(html: string, sourceLabel: string): InvestingSnapshot | null {
    const value = normalizeNumericString(extractDataTestValue(html, 'instrument-price-last'))
    if (value === null) return null

    const change = normalizeNumericString(extractDataTestValue(html, 'instrument-price-change'))
    const changePercent = normalizeNumericString(extractDataTestValue(html, 'instrument-price-change-percent'))

    return {
        value,
        change: change ?? undefined,
        changePercent: changePercent ?? undefined,
        trend: trendByChangePercent(changePercent),
        sourceLabel,
    }
}

async function fetchInvestingSnapshot(url: string, sourceLabel: string): Promise<InvestingSnapshot | null> {
    try {
        const response = await fetchWithTimeout(
            url,
            {
                headers: headersWithReferer(BROWSER_NAV_HEADERS, 'https://www.investing.com/', 'https://www.investing.com'),
            },
            12000,
        )

        if (!response.ok) return null
        const html = await response.text()
        return parseInvestingSnapshot(html, sourceLabel)
    } catch {
        return null
    }
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

function buildCacheWindow(ttlMs: number) {
    const now = Date.now()
    return {
        fetchedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlMs).toISOString(),
    }
}

function isCacheValid(expiresAt: string): boolean {
    return Date.parse(expiresAt) > Date.now()
}

function sanitizeTradeIntent(value?: string | null): string {
    const normalized = (value || 'none').trim().toLowerCase()
    if (!normalized) return 'none'
    return normalized.replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'none'
}

function reportCacheKey(score: number, intendedTrade?: string | null): string {
    return `score:${score}|trade:${sanitizeTradeIntent(intendedTrade)}`
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

function detectMarketRegime(dxyTrend: Trend, us10yTrend: Trend): 'trending' | 'range' {
    if (dxyTrend !== 'range' && us10yTrend !== 'range' && dxyTrend === us10yTrend) return 'trending'
    return 'range'
}

function getIndexMomentum(sp500Quote: Quote, nasdaqQuote: Quote): {
    weightedChange: number
    dispersion: number
    strength: number
    bias: Bias
} {
    const sp500Change = sp500Quote.regularMarketChangePercent || 0
    const nasdaqChange = nasdaqQuote.regularMarketChangePercent || 0

    const weightedChange = sp500Change * 0.45 + nasdaqChange * 0.55
    const dispersion = Math.abs(sp500Change - nasdaqChange)

    const strength = clamp(Math.abs(weightedChange) * 18 - dispersion * 4, 0, 100)

    let bias: Bias = 'Neutral'
    if (weightedChange >= 0.2) bias = 'Bullish'
    if (weightedChange <= -0.2) bias = 'Bearish'

    return {
        weightedChange,
        dispersion,
        strength,
        bias,
    }
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
- USTEC100: ${data.nasdaq}
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
    sp500Quote: Quote
    nasdaqQuote: Quote
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
        sp500Quote,
        nasdaqQuote,
        oilQuote,
        ffHighImpactCount,
        checklistScore,
        intendedTrade,
        llmResult,
    } = input

    const fundamentalBias = getFundamentalBias(data)
    const inferredGoldBias: Bias =
        fundamentalBias === 'bullish_gold' ? 'Bullish' : fundamentalBias === 'bearish_gold' ? 'Bearish' : 'Neutral'

    const macroIndicesBias: Bias =
        data.us10y.trend === 'up' && data.dxy.trend === 'up'
            ? 'Bearish'
            : data.us10y.trend === 'down' && data.dxy.trend === 'down'
                ? 'Bullish'
                : 'Neutral'

    const indexMomentum = getIndexMomentum(sp500Quote, nasdaqQuote)
    const inferredIndicesBias: Bias =
        macroIndicesBias === indexMomentum.bias
            ? macroIndicesBias
            : macroIndicesBias === 'Neutral'
                ? indexMomentum.bias
                : indexMomentum.bias === 'Neutral'
                    ? macroIndicesBias
                    : 'Neutral'

    const fundamentalStrength = clamp(
        (Math.abs(dxyQuote.regularMarketChangePercent || 0) +
            Math.abs(us10yQuote.regularMarketChangePercent || 0) +
            Math.abs(oilQuote.regularMarketChangePercent || 0)) *
        10,
        0,
        100,
    )

    const checklistStrength = checklistScore * 10
    const confidence = clamp(
        Math.round(
            checklistStrength * CONFIDENCE_WEIGHTS.checklist +
            fundamentalStrength * CONFIDENCE_WEIGHTS.macro +
            indexMomentum.strength * CONFIDENCE_WEIGHTS.indexMomentum,
        ),
        0,
        100,
    )

    const checklistWeightPct = Math.round(CONFIDENCE_WEIGHTS.checklist * 100)
    const macroWeightPct = Math.round(CONFIDENCE_WEIGHTS.macro * 100)
    const indexWeightPct = Math.round(CONFIDENCE_WEIGHTS.indexMomentum * 100)

    const goldBias = llmResult?.goldBias || inferredGoldBias
    const indicesBias = llmResult?.indicesBias || inferredIndicesBias
    const reasoning =
        llmResult?.reasoning?.length
            ? llmResult.reasoning
            : [
                `DXY is ${data.dxy.trend} and US10Y is ${data.us10y.trend}, shaping USD and discount-rate pressure.`,
                `Index momentum: S&P500 ${fmtPct(sp500Quote.regularMarketChangePercent)} / USTEC100 ${fmtPct(nasdaqQuote.regularMarketChangePercent)} with ${fmtPct(indexMomentum.weightedChange)} blended move.`,
                `Oil ${fmtPct(oilQuote.regularMarketChangePercent)} signals ${oilQuote.regularMarketChangePercent && oilQuote.regularMarketChangePercent > 0 ? 'rising' : 'easing'} inflation pressure.`,
                `Risk regime is ${data.social_sentiment}, used as a secondary confirmation layer.`,
                `Economic calendar carries ${ffHighImpactCount} high-impact events this week.`,
            ].slice(0, 5)

    const signalCore = generateSignal(checklistScore, goldBias)
    const conflict = detectConflict(checklistScore, goldBias, intendedTrade)
    const regime = detectMarketRegime(data.dxy.trend, data.us10y.trend)

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
            `S&P500 ${fmtPct(sp500Quote.regularMarketChangePercent)} | USTEC100 ${fmtPct(nasdaqQuote.regularMarketChangePercent)} (dispersion ${fmtPct(indexMomentum.dispersion)}).`,
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
                `S&P500 ${fmtNum(data.sp500, 2)} / USTEC100 ${fmtNum(data.nasdaq, 2)} with ${data.us10y.trend} yields imply ${indicesBias === 'Bearish' ? 'valuation pressure' : 'breathing room'}.`,
                'Earnings and rate expectations remain key directional filters.',
            ],
        },
        newsSentiment: [
            `High-impact events (ForexFactory): ${ffHighImpactCount}.`,
            `Institutional tone (Alpha Vantage/Finnhub/X): ${data.news.slice(0, 2).join(' | ') || 'No fresh headlines.'}`,
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
                `Confidence = (checklistScore * ${checklistWeightPct}%) + (macro fundamentals * ${macroWeightPct}%) + (S&P500/USTEC100 momentum * ${indexWeightPct}%).`,
                'Index dispersion between S&P500 and USTEC100 lowers index momentum strength.',
                'Strong DXY regime reduces gold long conviction.',
            ],
            eventAwareness: ffHighImpactCount > 0
                ? 'Event risk active: reduce confidence and wait for post-release confirmation.'
                : 'No major event cluster detected; normal execution protocol.',
        },
    }
}

async function fetchMacroSourceBundle(): Promise<MacroSourceBundle> {
    const cacheKey = 'market-news-bundle'
    const cached = sourceCache.get(cacheKey)
    if (cached && isCacheValid(cached.expiresAt)) {
        return cached
    }

    const inflight = inflightSourceFetches.get(cacheKey)
    if (inflight) {
        return inflight
    }

    const sourcePromise = (async () => {
        const sources = new Set<string>()
        const sourceHealth: SourceHealth[] = []

        const investingEntries = Object.entries(INVESTING_MARKET_ENDPOINTS) as Array<
            [keyof typeof INVESTING_MARKET_ENDPOINTS, (typeof INVESTING_MARKET_ENDPOINTS)[keyof typeof INVESTING_MARKET_ENDPOINTS]]
        >

        const [
            quoteRes,
            ffRes,
            investingRes,
            myfxbookRes,
            alphaVantageRes,
            finnhubRes,
            xRes,
            redditRes,
            investingMarketResults,
        ] = await Promise.allSettled([
            fetchWithTimeout(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(YAHOO_SYMBOLS.join(','))}`, {
                headers: headersWithReferer(
                    {
                        ...RSS_HEADERS,
                        Accept: 'application/json,text/plain,*/*',
                    },
                    'https://finance.yahoo.com/',
                    'https://finance.yahoo.com',
                ),
            }),
            fetchWithTimeout('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
                headers: headersWithReferer(RSS_HEADERS, 'https://www.forexfactory.com/', 'https://www.forexfactory.com'),
            }),
            fetchWithTimeout('https://www.investing.com/rss/news_25.rss', {
                headers: headersWithReferer(RSS_HEADERS, 'https://www.investing.com/', 'https://www.investing.com'),
            }),
            fetchHeadlineSource('Myfxbook', 'https://www.myfxbook.com/rss/forex-economic-calendar-events', 'rss', 8),
            fetchAlphaVantageNews(8),
            fetchFinnhubNews(8),
            fetchXFeedHeadlines(6),
            fetchHeadlineSource('Reddit', 'https://www.reddit.com/r/investing/.rss', 'rss', 5),
            Promise.all(
                investingEntries.map(async ([key, config]) => [key, await fetchInvestingSnapshot(config.url, config.sourceLabel)] as const),
            ),
        ])

        let quotes: Quote[] = []
        let ffHighImpactCount = 0
        let ffEvents: string[] = []
        let investingTitles: string[] = []
        let myfxbookTitles: string[] = []
        let alphaVantageTitles: string[] = []
        let finnhubTitles: string[] = []
        let xTitles: string[] = []
        let socialTitles: string[] = []

        if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
            const payload = await quoteRes.value.json()
            quotes = (payload?.quoteResponse?.result || []) as Quote[]
            sources.add('Yahoo Finance')
        }

        if (ffRes.status === 'fulfilled' && ffRes.value.ok) {
            const xml = await ffRes.value.text()
            const parsed = parseForexFactoryHighImpact(xml)
            ffHighImpactCount = parsed.count
            ffEvents = parsed.events
            sources.add('Forex Factory')
            sourceHealth.push({ label: 'Forex Factory', status: 'ok' })
        } else {
            sourceHealth.push({ label: 'Forex Factory', status: 'blocked' })
        }

        if (investingRes.status === 'fulfilled' && investingRes.value.ok) {
            const xml = await investingRes.value.text()
            investingTitles = parseRssTitles(xml, 5)
            sources.add('Investing.com News')
            sourceHealth.push({ label: 'Investing.com News', status: investingTitles.length > 0 ? 'ok' : 'empty' })
        } else {
            sourceHealth.push({ label: 'Investing.com News', status: 'error' })
        }

        if (myfxbookRes.status === 'fulfilled') {
            myfxbookTitles = myfxbookRes.value.titles
            sourceHealth.push(myfxbookRes.value.health)
            if (myfxbookTitles.length > 0) {
                sources.add('Myfxbook')
            }
        }

        if (alphaVantageRes.status === 'fulfilled') {
            alphaVantageTitles = alphaVantageRes.value.titles
            sourceHealth.push(alphaVantageRes.value.health)
            if (alphaVantageTitles.length > 0) {
                sources.add('Alpha Vantage')
            }
        }

        if (finnhubRes.status === 'fulfilled') {
            finnhubTitles = finnhubRes.value.titles
            sourceHealth.push(finnhubRes.value.health)
            if (finnhubTitles.length > 0) {
                sources.add('Finnhub')
            }
        }

        if (xRes.status === 'fulfilled') {
            xTitles = xRes.value.titles
            sourceHealth.push(xRes.value.health)
            if (xTitles.length > 0) {
                sources.add('X Feed')
            }
        }

        if (redditRes.status === 'fulfilled') {
            socialTitles = redditRes.value.titles
            sourceHealth.push(redditRes.value.health)
            if (socialTitles.length > 0) {
                sources.add('Reddit')
            }
        }

        const investingSnapshots: Partial<Record<keyof typeof INVESTING_MARKET_ENDPOINTS, InvestingSnapshot | null>> = {}
        if (investingMarketResults.status === 'fulfilled') {
            for (const [key, snapshot] of investingMarketResults.value) {
                investingSnapshots[key] = snapshot
                if (snapshot) {
                    sources.add(snapshot.sourceLabel)
                }
            }
        }

        const cacheWindow = buildCacheWindow(SOURCE_CACHE_TTL_MS)
        const bundle: MacroSourceBundle = {
            ...cacheWindow,
            sources: sources.size > 0 ? Array.from(sources) : ['Heuristic Fallback'],
            sourceDiagnostics: sourceHealth,
            quotes,
            ffHighImpactCount,
            ffEvents,
            investingTitles,
            myfxbookTitles,
            alphaVantageTitles,
            finnhubTitles,
            xTitles,
            socialTitles,
            investingSnapshots,
        }

        sourceCache.set(cacheKey, bundle)
        return bundle
    })()

    inflightSourceFetches.set(cacheKey, sourcePromise)

    try {
        return await sourcePromise
    } finally {
        inflightSourceFetches.delete(cacheKey)
    }
}

async function generateMacroReport(checklistScore: number, intendedTrade?: string | null): Promise<ReportCacheEntry> {
    const sourceBundle = await fetchMacroSourceBundle()

    const {
        quotes,
        ffHighImpactCount,
        ffEvents,
        investingTitles,
        myfxbookTitles,
        alphaVantageTitles,
        finnhubTitles,
        xTitles,
        socialTitles,
        investingSnapshots,
    } = sourceBundle

    const dxy = safeQuote(quotes, 'DX-Y.NYB')
    const us10y = safeQuote(quotes, '^TNX')
    const gold = safeQuote(quotes, 'GC=F')
    const spx = safeQuote(quotes, '^GSPC')
    const ndx = safeQuote(quotes, '^NDX')
    const oil = safeQuote(quotes, 'CL=F')

    const dxySnapshot = investingSnapshots.dxy
    const us10ySnapshot = investingSnapshots.us10y
    const us2ySnapshot = investingSnapshots.us2y
    const goldSnapshot = investingSnapshots.gold
    const sp500Snapshot = investingSnapshots.sp500
    const nasdaqSnapshot = investingSnapshots.nasdaq
    const oilSnapshot = investingSnapshots.oil

    const relevantHeadlines = selectRelevantHeadlines(
        [
            ...investingTitles,
            ...myfxbookTitles,
            ...alphaVantageTitles,
            ...finnhubTitles,
            ...xTitles,
        ],
        10,
    )
    const socialSentiment = scoreHeadlineTone(socialTitles)

    const marketData: MarketData = {
        dxy: {
            value: dxySnapshot?.value ?? dxy.regularMarketPrice ?? 0,
            trend: dxySnapshot?.trend ?? trendByAverages(dxy.regularMarketPrice, dxy.fiftyDayAverage, dxy.twoHundredDayAverage),
        },
        us10y: {
            value: us10ySnapshot?.value ?? us10y.regularMarketPrice ?? 0,
            trend: us10ySnapshot?.trend ?? trendByAverages(us10y.regularMarketPrice, us10y.fiftyDayAverage, us10y.twoHundredDayAverage),
        },
        us2y: {
            value: us2ySnapshot?.value ?? 0,
            trend: us2ySnapshot?.trend ?? 'range',
        },
        gold_price: goldSnapshot?.value ?? gold.regularMarketPrice ?? 0,
        sp500: sp500Snapshot?.value ?? spx.regularMarketPrice ?? 0,
        nasdaq: nasdaqSnapshot?.value ?? ndx.regularMarketPrice ?? 0,
        oil_price: oilSnapshot?.value ?? oil.regularMarketPrice ?? 0,
        news: relevantHeadlines.slice(0, 8),
        economic_events: ffEvents.slice(0, 8),
        social_sentiment: socialSentiment,
    }

    const dxyForReport: Quote = {
        ...dxy,
        regularMarketPrice: dxySnapshot?.value ?? dxy.regularMarketPrice,
        regularMarketChangePercent: dxySnapshot?.changePercent ?? dxy.regularMarketChangePercent,
    }
    const us10yForReport: Quote = {
        ...us10y,
        regularMarketPrice: us10ySnapshot?.value ?? us10y.regularMarketPrice,
        regularMarketChangePercent: us10ySnapshot?.changePercent ?? us10y.regularMarketChangePercent,
    }
    const oilForReport: Quote = {
        ...oil,
        regularMarketPrice: oilSnapshot?.value ?? oil.regularMarketPrice,
        regularMarketChangePercent: oilSnapshot?.changePercent ?? oil.regularMarketChangePercent,
    }
    const sp500ForReport: Quote = {
        ...spx,
        regularMarketPrice: sp500Snapshot?.value ?? spx.regularMarketPrice,
        regularMarketChangePercent: sp500Snapshot?.changePercent ?? spx.regularMarketChangePercent,
    }
    const nasdaqForReport: Quote = {
        ...ndx,
        regularMarketPrice: nasdaqSnapshot?.value ?? ndx.regularMarketPrice,
        regularMarketChangePercent: nasdaqSnapshot?.changePercent ?? ndx.regularMarketChangePercent,
    }

    const llmResult = await runLLMReasoning(marketData)
    const report = buildReport({
        data: marketData,
        dxyQuote: dxyForReport,
        us10yQuote: us10yForReport,
        sp500Quote: sp500ForReport,
        nasdaqQuote: nasdaqForReport,
        oilQuote: oilForReport,
        ffHighImpactCount,
        checklistScore,
        intendedTrade,
        llmResult,
    })

    const sourceStatusSummary = sourceBundle.sourceDiagnostics
        .filter((item) => item.status !== 'ok')
        .map((item) => `${item.label}: ${item.status}`)

    report.sources = [...sourceBundle.sources]
    report.sourceDiagnostics = sourceBundle.sourceDiagnostics
    report.cache = {
        mode: 'fresh',
        fetchedAt: sourceBundle.fetchedAt,
        expiresAt: sourceBundle.expiresAt,
    }

    if (sourceStatusSummary.length > 0) {
        report.sources.push(...sourceStatusSummary)
    }

    const reportWindow = buildCacheWindow(REPORT_CACHE_TTL_MS)
    return {
        ...reportWindow,
        report,
    }
}

export async function getMacroReport(checklistScore: number, intendedTrade?: string | null): Promise<MacroDeskReport> {
    const cacheKey = reportCacheKey(checklistScore, intendedTrade)
    const cached = reportCache.get(cacheKey)
    if (cached && isCacheValid(cached.expiresAt)) {
        return {
            ...cached.report,
            cache: {
                mode: 'warm',
                fetchedAt: cached.fetchedAt,
                expiresAt: cached.expiresAt,
            },
        }
    }

    const inflight = inflightReportFetches.get(cacheKey)
    if (inflight) {
        const shared = await inflight
        return {
            ...shared.report,
            cache: {
                mode: 'warm',
                fetchedAt: shared.fetchedAt,
                expiresAt: shared.expiresAt,
            },
        }
    }

    const reportPromise = generateMacroReport(checklistScore, intendedTrade)
    inflightReportFetches.set(cacheKey, reportPromise)

    try {
        const entry = await reportPromise
        reportCache.set(cacheKey, entry)
        return entry.report
    } finally {
        inflightReportFetches.delete(cacheKey)
    }
}

export async function prewarmMacroBriefReports() {
    const commonCombos = [
        { score: 6, trade: 'buy' },
        { score: 6, trade: 'sell' },
        { score: 8, trade: 'buy' },
        { score: 8, trade: 'sell' },
        { score: 8, trade: 'none' },
    ]

    const warmed = await Promise.allSettled(
        commonCombos.map(async ({ score, trade }) => {
            const report = await getMacroReport(score, trade)
            return {
                key: reportCacheKey(score, trade),
                generatedAt: report.generatedAt,
                cacheExpiresAt: report.cache?.expiresAt,
            }
        }),
    )

    return warmed.map((result, index) => {
        const combo = commonCombos[index]
        if (result.status === 'fulfilled') {
            return {
                score: combo.score,
                trade: combo.trade,
                status: 'ok' as const,
                generatedAt: result.value.generatedAt,
                cacheExpiresAt: result.value.cacheExpiresAt,
            }
        }

        return {
            score: combo.score,
            trade: combo.trade,
            status: 'error' as const,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        }
    })
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const checklistScore = clamp(Number(url.searchParams.get('score') || 7), 0, 10)
        const intendedTrade = url.searchParams.get('trade')
        const report = await getMacroReport(checklistScore, intendedTrade)

        return NextResponse.json(
            { result: report },
            {
                headers: {
                    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
                },
            },
        )
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
