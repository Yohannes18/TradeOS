import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TradeJournalTable } from '@/components/dashboard/trade-journal-table'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export default async function JournalPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const { data: trades } = await supabase
        .from('trades')
        .select('id, created_at, pair, setup_grade, risk_amount, position_size, entry, sl, tp, rr, notes, result, ai_recommendation, bias, trade_date, session, emotions')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300)

    const normalized = (trades || []).map((trade) => ({
        id: trade.id,
        created_at: trade.created_at,
        pair: trade.pair,
        checklist_grade: trade.setup_grade,
        risk_amount: trade.risk_amount,
        position_size: trade.position_size,
        entry: trade.entry,
        sl: trade.sl,
        tp: trade.tp,
        rr: trade.rr,
        pl: trade.result === 'win' ? Number(trade.risk_amount || 0) * Number(trade.rr || 0) : trade.result === 'loss' ? -Number(trade.risk_amount || 0) : 0,
        ai_bias: trade.bias,
        ai_recommendation: trade.ai_recommendation,
        notes: trade.notes,
        result: trade.result,
        session: trade.session,
        emotions: trade.emotions,
    }))

    return (
        <div className="page-wrap overflow-auto pb-20">
            <TradeJournalTable trades={normalized} />
        </div>
    )
}
