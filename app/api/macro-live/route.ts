import { NextResponse } from 'next/server'

// Free market data from Yahoo Finance via public API
const SYMBOLS = [
    { symbol: 'DX-Y.NYB', label: 'US Dollar Index', key: 'DXY', category: 'fx', tvSymbol: 'TVC:DXY' },
    { symbol: 'GC=F', label: 'Gold', key: 'XAUUSD', category: 'metal', tvSymbol: 'OANDA:XAUUSD' },
    { symbol: '^TNX', label: 'US 10Y Yield', key: 'US10Y', category: 'bond', tvSymbol: 'TVC:US10Y' },
    { symbol: '^GSPC', label: 'S&P 500', key: 'SPX', category: 'index', tvSymbol: 'OANDA:SPX500USD' },
    { symbol: '^NDX', label: 'Nasdaq 100', key: 'NAS100', category: 'index', tvSymbol: 'OANDA:NAS100USD' },
    { symbol: 'EURUSD=X', label: 'EUR/USD', key: 'EURUSD', category: 'fx', tvSymbol: 'OANDA:EURUSD' },
    { symbol: 'GBPUSD=X', label: 'GBP/USD', key: 'GBPUSD', category: 'fx', tvSymbol: 'OANDA:GBPUSD' },
    { symbol: 'CL=F', label: 'WTI Crude Oil', key: 'USOIL', category: 'energy', tvSymbol: 'OANDA:WTICOUSD' },
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

export async function GET() {
    try {
        const symbolStr = SYMBOLS.map(s => s.symbol).join(',')
        const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbolStr)}&range=1d&interval=1d`

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 60 },
        })

        if (!response.ok) throw new Error('Yahoo Finance unavailable')

        const json = await response.json()
        const spark = json?.spark?.result || []

        const tiles = SYMBOLS.map((meta) => {
            const item = spark.find((r: { symbol: string }) => r.symbol === meta.symbol)
            const response_item = item?.response?.[0]
            const meta_data = response_item?.meta

            if (!meta_data) {
                return null
            }

            const price = meta_data.regularMarketPrice ?? 0
            const prevClose = meta_data.chartPreviousClose ?? price
            const change = price - prevClose
            const changePct = prevClose ? (change / prevClose) * 100 : 0
            const direction: 'up' | 'down' | 'flat' = change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat'

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

        if (tiles.length < 4) throw new Error('Insufficient Yahoo Finance data')

        return NextResponse.json(tiles)
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to fetch live market data from Yahoo Finance.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 502 },
        )
    }
}
