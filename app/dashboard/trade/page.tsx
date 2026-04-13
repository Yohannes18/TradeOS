import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TradeWorkspace } from '@/components/dashboard/trade-workspace'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

interface HistoricalPreTradeRow {
    id: string
    pair: string
    status: string
    final_score: number | null
    created_at: string
    checklist: Record<string, unknown> | null
}

export default async function TradePage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const [{ data: settings }, { data: historicalTrades }] = await Promise.all([
        supabase
            .from('settings')
            .select('risk_percent, account_balance, default_pair')
            .eq('user_id', user.id)
            .single(),
        supabase
            .from('pre_trades')
            .select('id, pair, status, final_score, created_at, checklist')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
    ])

    const normalizedTrades = ((historicalTrades || []) as HistoricalPreTradeRow[]).map((trade) => ({
        id: trade.id,
        pair: trade.pair,
        result: trade.status,
        setup_grade:
            trade.final_score && trade.final_score >= 0.9
                ? 'A+'
                : trade.final_score && trade.final_score >= 0.84
                    ? 'A'
                    : trade.final_score && trade.final_score >= 0.76
                        ? 'A-'
                        : trade.final_score && trade.final_score >= 0.65
                            ? 'B'
                            : 'F',
        trade_date: trade.created_at.slice(0, 10),
        created_at: trade.created_at,
        notes: typeof trade.checklist?.notes === 'string' ? trade.checklist.notes : null,
        checklist_json: trade.checklist,
    }))

    return (
        <TradeWorkspace
            userId={user.id}
            accountBalance={Number(settings?.account_balance || 10000)}
            riskPercent={Number(settings?.risk_percent || 1)}
            defaultPair={settings?.default_pair || 'XAUUSD'}
            historicalTrades={normalizedTrades}
        />
    )
}
