import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TradeWorkspace } from '@/components/dashboard/trade-workspace'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

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
            .from('trades')
            .select('id, pair, result, setup_grade, trade_date, created_at, notes, checklist_json')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
    ])

    return (
        <TradeWorkspace
            userId={user.id}
            accountBalance={Number(settings?.account_balance || 10000)}
            riskPercent={Number(settings?.risk_percent || 1)}
            defaultPair={settings?.default_pair || 'XAUUSD'}
            historicalTrades={historicalTrades || []}
        />
    )
}
