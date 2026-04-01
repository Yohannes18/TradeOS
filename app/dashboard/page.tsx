import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { ProfessionalDashboard } from '@/components/dashboard/professional-dashboard'
import type { ProfessionalCalendarDay } from '@/components/dashboard/professional-calendar'
import type { ChecklistStatus } from '@/lib/trading/types'
import { getMacroReport } from '@/app/api/macro-brief/route'

interface TradeRow {
    id: string
    pair: string
    created_at: string
    result?: 'win' | 'loss' | 'breakeven' | 'pending' | null
    rr?: number | null
    setup_grade?: string | null
    ai_recommendation?: string | null
    risk_amount?: number | null
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

    const [{ data: trades }, { data: summaries }, macroReport] = await Promise.all([
        supabase
            .from('trades')
            .select('id, pair, created_at, result, rr, setup_grade, ai_recommendation, risk_amount')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(120),
        supabase
            .from('daily_summary')
            .select('summary_date, trade_count, net_pl, r_multiple, win_rate, top_setup')
            .eq('user_id', user.id)
            .order('summary_date', { ascending: false })
            .limit(90),
        getMacroReport(8, 'XAUUSD'),
    ])

    const rows = (trades || []) as TradeRow[]
    const completed = rows.filter((row) => row.result && row.result !== 'pending')
    const wins = completed.filter((row) => row.result === 'win').length
    const losses = completed.filter((row) => row.result === 'loss').length
    const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0
    const profitFactor = losses ? (wins / losses).toFixed(2) : wins ? '∞' : '0.00'

    const bestSetup = rows.find((row) => row.setup_grade)?.setup_grade || 'N/A'

    const calendarData: ProfessionalCalendarDay[] = ((summaries || []) as DailySummaryRow[]).map((row) => ({
        date: row.summary_date,
        netPnl: Number(row.net_pl || 0),
        trades: Number(row.trade_count || 0),
        rMultiple: Number(row.r_multiple || 0),
        winRate: Number(row.win_rate || 0),
        topSetup: row.top_setup || undefined,
        recommendation: row.net_pl > 0 ? 'CONFIRM' : row.net_pl < 0 ? 'WAIT' : 'INVALID',
    }))

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
