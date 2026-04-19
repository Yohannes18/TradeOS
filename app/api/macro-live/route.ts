import { NextResponse } from 'next/server'
import { getMacroReport } from '@/app/api/macro-brief/route'

type TileCategory = 'fx' | 'metal' | 'index' | 'bond' | 'energy'

const BIAS_MAP: Record<string, string> = {
    DXY: 'USD strength driven by Fed hold narrative and sticky inflation.',
    XAUUSD: 'Safe-haven demand supported by real-yield compression.',
    US10Y: 'Higher-for-longer narrative keeping yields elevated.',
    SPX: 'Mega-cap earnings tailwinds with cautious market breadth.',
    NAS100: 'Tech momentum intact, AI-driven sentiment positive.',
    USOIL: 'Supply-demand balance with geopolitical risk premium.',
}

function formatPrice(price: number, symbol: string): string {
    if (symbol === 'DXY') return price.toFixed(2)
    if (symbol === 'XAUUSD') return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    if (symbol === 'US10Y') return `${price.toFixed(2)}%`
    if (symbol === 'USOIL') return price.toFixed(2)
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function directionFromTrend(trend?: string): 'up' | 'down' | 'flat' {
    if (trend === 'up') return 'up'
    if (trend === 'down') return 'down'
    return 'flat'
}

function buildTile(symbol: string, label: string, category: TileCategory, tvSymbol: string, value: number, trend?: string) {
    return {
        symbol,
        label,
        price: formatPrice(value, symbol),
        change: '+0.00',
        changePct: '+0.00%',
        direction: directionFromTrend(trend),
        bias: BIAS_MAP[symbol] || 'No dominant bias detected.',
        category,
        tvSymbol,
    }
}

export async function GET() {
    try {
        const report = await getMacroReport(8, 'none')
        const data = report.marketData

        const tiles = [
            buildTile('DXY', 'US Dollar Index', 'fx', 'TVC:DXY', data.dxy.value, data.dxy.trend),
            buildTile('XAUUSD', 'Gold', 'metal', 'OANDA:XAUUSD', data.gold_price),
            buildTile('US10Y', 'US 10Y Yield', 'bond', 'TVC:US10Y', data.us10y.value, data.us10y.trend),
            buildTile('SPX', 'S&P 500', 'index', 'OANDA:SPX500USD', data.sp500),
            buildTile('NAS100', 'Nasdaq 100', 'index', 'OANDA:NAS100USD', data.nasdaq),
            buildTile('USOIL', 'WTI Crude Oil', 'energy', 'OANDA:WTICOUSD', data.oil_price),
        ].filter((tile) => Number.isFinite(Number(tile.price.replace(/[^0-9.-]/g, ''))))

        if (tiles.length < 4) {
            throw new Error('Insufficient macro report market data')
        }

        return NextResponse.json(tiles)
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to fetch live market data from macro brief feed.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 502 },
        )
    }
}