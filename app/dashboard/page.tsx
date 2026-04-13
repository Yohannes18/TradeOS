import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { ProfessionalDashboard } from '@/components/dashboard/professional-dashboard'
import type { ProfessionalCalendarDay } from '@/components/dashboard/professional-calendar'
import type { ChecklistStatus } from '@/lib/trading/types'
import { getMacroReport } from '@/app/api/macro-brief/route'
import { getCachedTradingAnalytics } from '@/lib/services/analytics-service'

interface ExecutionRow {
    id: string
    pre_trade_id: string
    pair: string
    created_at: string
    executed_at: string
    closed_at: string | null
    entry: number
    stop_loss: number
    take_profit: number
    risk_percent: number
    position_size: number
    status: 'executed' | 'closed'
}

interface PreTradeRow {
    id: string
    pair: string
    created_at: string
    final_score: number
    ai_verdict: string
}

interface DailySummaryRow {
    summary_date: string
    trade_count: number
    net_pl: number
    r_multiple: number
    win_rate: number
    top_setup: string | null
}

export default async function DashboardPage() {
    const user = await getAuthenticatedUser()
    if (!user) redirect('/auth/login')

    const supabase = await createClient()

    const [{ data: settings }, { data: executions }, { data: preTrades }, analytics, macroReport] = await Promise.all([
        supabase
            .from('settings')
            .select('risk_percent, account_balance, default_pair')
            .eq('user_id', user.id)
            .single(),
        supabase
            .from('executions')
            .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit, risk_percent, position_size, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(120),
        supabase
            .from('pre_trades')
            .select('id, pair, created_at, final_score, ai_verdict')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(120),
        getCachedTradingAnalytics(user.id),
        getMacroReport(8, 'XAUUSD'),
    ])

    const preTradeMap = new Map(((preTrades || []) as PreTradeRow[]).map((row) => [row.id, row]))
    const executionIds = ((executions || []) as ExecutionRow[]).map((row) => row.id)
    const { data: metrics } = executionIds.length
        ? await supabase
            .from('trade_metrics')
            .select('execution_id, rr_ratio, pnl, win_loss')
            .in('execution_id', executionIds)
        : { data: [] }
    const metricsMap = new Map(((metrics || []) as { execution_id: string; rr_ratio: number; pnl: number; win_loss: 'win' | 'loss' | 'breakeven' }[]).map((row) => [row.execution_id, row]))
    const rows = ((executions || []) as ExecutionRow[]).map((execution) => {
        const preTrade = preTradeMap.get(execution.pre_trade_id)
        const metric = metricsMap.get(execution.id)
        return {
            id: execution.id,
            pair: preTrade?.pair || 'UNKNOWN',
            created_at: execution.closed_at || execution.executed_at || execution.created_at,
            result: metric?.win_loss || (execution.status === 'closed' ? 'breakeven' : 'pending'),
            rr: metric?.rr_ratio ?? null,
            setup_grade:
                preTrade?.final_score && preTrade.final_score >= 0.9
                    ? 'A+'
                    : preTrade?.final_score && preTrade.final_score >= 0.84
                        ? 'A'
                        : preTrade?.final_score && preTrade.final_score >= 0.76
                            ? 'A-'
                            : preTrade?.final_score && preTrade.final_score >= 0.65
                                ? 'B'
                                : 'F',
            ai_recommendation: preTrade?.ai_verdict || 'STANDBY',
            risk_amount: Number(settings?.account_balance || 10000) * Number(execution.risk_percent || settings?.risk_percent || 1) / 100,
        }
    })

    const completed = rows.filter((row) => row.result && row.result !== 'pending')
    const winRate = Math.round(Number(analytics.winRate || 0) * 100)
    const profitFactor = completed.length ? (Number(analytics.netPnl || 0) >= 0 ? '1.00' : '0.00') : '0.00'

    const bestSetup = rows.find((row) => row.setup_grade)?.setup_grade || 'N/A'

    const dayBuckets = new Map<string, typeof rows>()
    for (const trade of rows) {
        const key = trade.created_at.slice(0, 10)
        const bucket = dayBuckets.get(key) || []
        bucket.push(trade)
        dayBuckets.set(key, bucket)
    }

    const calendarData: ProfessionalCalendarDay[] = Array.from(dayBuckets.entries()).map(([date, trades]) => {
        const completedTrades = trades.filter((trade) => trade.result && trade.result !== 'pending')
        const wins = completedTrades.filter((trade) => trade.result === 'win').length
        const netPnl = completedTrades.reduce((sum, trade) => sum + (trade.result === 'win' ? Number(trade.risk_amount || 0) : trade.result === 'loss' ? -Number(trade.risk_amount || 0) : 0), 0)
        return {
            date,
            netPnl,
            trades: trades.length,
            rMultiple: completedTrades.length,
            winRate: completedTrades.length ? (wins / completedTrades.length) * 100 : 0,
            topSetup: trades.find((trade) => trade.setup_grade)?.setup_grade || undefined,
            recommendation: netPnl > 0 ? 'CONFIRM' : netPnl < 0 ? 'WAIT' : 'INVALID',
        }
    }).sort((a, b) => b.date.localeCompare(a.date))

    const metrics = [
        { label: 'Win Rate', value: `${winRate}%`, tone: 'profit' as const, sparkline: [8, 10, 9, 13, 14, 11, 15] },
        { label: 'Profit Factor', value: profitFactor, tone: 'neutral' as const, sparkline: [6, 8, 10, 9, 11, 12, 10] },
        { label: 'Total Trades', value: String(rows.length), tone: 'neutral' as const, sparkline: [4, 6, 7, 9, 8, 10, 11] },
        { label: 'Best Setup', value: bestSetup, tone: 'profit' as const, sparkline: [5, 7, 6, 8, 7, 9, 12] },
    ]

    const score = Math.round((winRate * 0.6 + Math.min(100, rows.length) * 0.4) * 10) / 10
    const checklistStatus: ChecklistStatus = score >= 72 ? 'AUTHORIZED' : score <= 45 ? 'INVALID' : 'STANDBY'

    return (
        <ProfessionalDashboard
            metrics={metrics}
            calendarData={calendarData}
            trades={rows}
            score={score}
            checklistStatus={checklistStatus}
            macroReport={{
                aiBias: `${macroReport.aiDecision.goldBias} gold / ${macroReport.aiDecision.indicesBias} indices`,
                alert: macroReport.marketData.economic_events[0] || macroReport.riskFactors[0] || 'No active alert.',
                plan: macroReport.tradeImplication.whatToDo[0] || 'Stay selective and wait for aligned confirmation.',
            }}
        />
    )
}
