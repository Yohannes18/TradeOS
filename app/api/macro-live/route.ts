import { NextResponse } from 'next/server'

const MARKET_DATA_USER_AGENT =
    process.env.MARKET_DATA_USER_AGENT ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'

type Trend = 'up' | 'down' | 'range'

type InvestingInstrument = {
    key: string
    label: string
    category: 'fx' | 'metal' | 'index' | 'bond' | 'energy'
    tvSymbol: string
    url: string
}

type InvestingSnapshot = {
    value: number
    change?: number
    changePercent?: number
    trend: Trend
}

const INSTRUMENTS: InvestingInstrument[] = [
    {
        key: 'DXY',
        label: 'US Dollar Index',
        category: 'fx',
        tvSymbol: 'TVC:DXY',
        url: 'https://www.investing.com/currencies/us-dollar-index',
    },
    {
        key: 'XAUUSD',
        label: 'Gold',
        category: 'metal',
        tvSymbol: 'OANDA:XAUUSD',
        url: 'https://www.investing.com/commodities/gold',
    },
    {
        key: 'US10Y',
        label: 'US 10Y Yield',
        category: 'bond',
        tvSymbol: 'TVC:US10Y',
        url: 'https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield',
    },
    {
        key: 'SPX',
        label: 'S&P 500',
        category: 'index',
        tvSymbol: 'OANDA:SPX500USD',
        url: 'https://www.investing.com/indices/us-spx-500',
    },
    {
        key: 'NAS100',
        label: 'Nasdaq 100',
        category: 'index',
        tvSymbol: 'OANDA:NAS100USD',
        url: 'https://www.investing.com/indices/nq-100',
    },
    {
        key: 'USOIL',
        label: 'WTI Crude Oil',
        category: 'energy',
        tvSymbol: 'OANDA:WTICOUSD',
        url: 'https://www.investing.com/commodities/crude-oil',
    },
]

const BIAS_MAP: Record<string, string> = {
    DXY: 'USD strength driven by Fed hold narrative and sticky inflation.',
    XAUUSD: 'Safe-haven demand supported by real-yield compression.',
    US10Y: 'Higher-for-longer narrative keeping yields elevated.',
    SPX: 'Mega-cap earnings tailwinds with cautious market breadth.',
    NAS100: 'Tech momentum intact, AI-driven sentiment positive.',
    EURUSD: 'ECB dovish pivot expectations weigh on EUR.',
    GBPUSD: 'BoE uncertainty creating two-way flow.',
    USOIL: 'Supply-demand balance with geopolitical risk premium.',
}

function formatPrice(price: number, symbol: string): string {
    if (symbol === 'DXY') return price.toFixed(2)
    if (symbol === 'XAUUSD') return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    if (symbol === 'US10Y') return `${price.toFixed(2)}%`
    if (symbol.includes('USD') && !symbol.includes('USOIL')) return price.toFixed(4)
    if (symbol === 'USOIL') return price.toFixed(2)
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function trendByChangePercent(changePercent?: number | null): Trend {
    if (typeof changePercent !== 'number' || Number.isNaN(changePercent)) return 'range'
    if (changePercent >= 0.15) return 'up'
    if (changePercent <= -0.15) return 'down'
    return 'range'
}

function normalizeNumericString(value: string | null): number | null {
    if (!value) return null
    const cleaned = value.replace(/,/g, '').replace(/%/g, '').replace(/\s+/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
}

function extractDataTestValue(html: string, testId: string): string | null {
    const pattern = new RegExp(`data-test="${testId}"[^>]*>([^<]+)`, 'i')
    const match = html.match(pattern)
    return match?.[1]?.trim() || null
}

function parseInvestingSnapshot(html: string): InvestingSnapshot | null {
    const value = normalizeNumericString(extractDataTestValue(html, 'instrument-price-last'))
    if (value === null) return null

    const change = normalizeNumericString(extractDataTestValue(html, 'instrument-price-change'))
    const changePercent = normalizeNumericString(extractDataTestValue(html, 'instrument-price-change-percent'))

    return {
        value,
        change: change ?? undefined,
        changePercent: changePercent ?? undefined,
        trend: trendByChangePercent(changePercent),
    }
}

async function fetchInvestingSnapshot(url: string): Promise<InvestingSnapshot | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': MARKET_DATA_USER_AGENT,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                Referer: 'https://www.investing.com/',
                Origin: 'https://www.investing.com',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
            },
            next: { revalidate: 60 },
        })

        if (!response.ok) return null
        const html = await response.text()
        return parseInvestingSnapshot(html)
    } catch {
        return null
    }
}

export async function GET() {
    try {
        const snapshotResults = await Promise.all(INSTRUMENTS.map((instrument) => fetchInvestingSnapshot(instrument.url)))

        const tiles = INSTRUMENTS.map((meta, index) => {
            const snapshot = snapshotResults[index]
            if (!snapshot) return null

            const price = snapshot.value
            const change = snapshot.change ?? 0
            const changePct = snapshot.changePercent ?? 0
            const direction: 'up' | 'down' | 'flat' = snapshot.trend === 'range' ? 'flat' : snapshot.trend

            return {
                symbol: meta.key,
                label: meta.label,
                price: formatPrice(price, meta.key),
                change: change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
                changePct: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
                direction,
                bias: BIAS_MAP[meta.key] || 'No dominant bias detected.',
                category: meta.category,
                tvSymbol: meta.tvSymbol,
            }
        }).filter(Boolean)

        if (tiles.length < 4) throw new Error('Insufficient Investing.com market data')

        return NextResponse.json(tiles)
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to fetch live market data from Investing.com.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 502 },
        )
    }
}
