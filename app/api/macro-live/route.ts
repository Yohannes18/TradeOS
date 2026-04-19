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

function formatChange(change?: number): string {
    if (typeof change !== 'number' || Number.isNaN(change)) return '+0.00'
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}`
}

function formatChangePercent(changePercent?: number): string {
    if (typeof changePercent !== 'number' || Number.isNaN(changePercent)) return '+0.00%'
    return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
}

function directionFromTrend(trend?: string): 'up' | 'down' | 'flat' {
    if (trend === 'up') return 'up'
    if (trend === 'down') return 'down'
    return 'flat'
}

function buildTile(
    symbol: string,
    label: string,
    category: TileCategory,
    tvSymbol: string,
    value: number,
    trend?: string,
    change?: number,
    changePercent?: number,
) {
    return {
        symbol,
        label,
        price: formatPrice(value, symbol),
        change: formatChange(change),
        changePct: formatChangePercent(changePercent),
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
            buildTile('DXY', 'US Dollar Index', 'fx', 'TVC:DXY', data.dxy.value, data.dxy.trend, data.dxy.change, data.dxy.changePercent),
            buildTile('XAUUSD', 'Gold', 'metal', 'OANDA:XAUUSD', data.gold_price, undefined, data.gold_change, data.gold_changePercent),
            buildTile('US10Y', 'US 10Y Yield', 'bond', 'TVC:US10Y', data.us10y.value, data.us10y.trend, data.us10y.change, data.us10y.changePercent),
            buildTile('SPX', 'S&P 500', 'index', 'OANDA:SPX500USD', data.sp500, undefined, data.sp500_change, data.sp500_changePercent),
            buildTile('NAS100', 'Nasdaq 100', 'index', 'OANDA:NAS100USD', data.nasdaq, undefined, data.nasdaq_change, data.nasdaq_changePercent),
            buildTile('USOIL', 'WTI Crude Oil', 'energy', 'OANDA:WTICOUSD', data.oil_price, undefined, data.oil_change, data.oil_changePercent),
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