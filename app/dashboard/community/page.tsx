import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { CommunityHub } from '@/components/dashboard/community-hub'

interface ExecutionRow {
    id: string
    user_id: string
    pre_trade_id: string
    created_at: string
}

interface PreTradeRow {
    id: string
    user_id: string
    final_score: number | null
}

interface MetricRow {
    execution_id: string
    rr_ratio: number
    win_loss: 'win' | 'loss' | 'breakeven'
}

export default async function CommunityPage() {
    const user = await getAuthenticatedUser()
    if (!user) redirect('/auth/login')

    const supabase = await createClient()

    const { data: executions } = await supabase
        .from('executions')
        .select('id, user_id, pre_trade_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

    const { data: preTrades } = await supabase
        .from('pre_trades')
        .select('id, user_id, final_score')
        .in('id', ((executions || []) as ExecutionRow[]).map((row) => row.pre_trade_id))

    const { data: metrics } = await supabase
        .from('trade_metrics')
        .select('execution_id, rr_ratio, win_loss')
        .in('execution_id', ((executions || []) as ExecutionRow[]).map((row) => row.id))

    const preTradeMap = new Map(((preTrades || []) as PreTradeRow[]).map((row) => [row.id, row]))
    const metricMap = new Map(((metrics || []) as MetricRow[]).map((row) => [row.execution_id, row]))

    const userStats: Record<string, { wins: number; total: number; rr: number[]; grade: string[] }> = {}

    for (const execution of (executions || []) as ExecutionRow[]) {
        const metric = metricMap.get(execution.id)
        const preTrade = preTradeMap.get(execution.pre_trade_id)
        const userId = execution.user_id

        if (!userStats[userId]) {
            userStats[userId] = { wins: 0, total: 0, rr: [], grade: [] }
        }
        const u = userStats[userId]
        u.total++
        if (metric?.win_loss === 'win') u.wins++
        if (metric?.rr_ratio) u.rr.push(metric.rr_ratio)
        if (preTrade?.final_score) u.grade.push(preTrade.final_score >= 0.9 ? 'A+' : preTrade.final_score >= 0.84 ? 'A' : preTrade.final_score >= 0.76 ? 'A-' : preTrade.final_score >= 0.65 ? 'B' : 'F')
    }

    const ranked = Object.entries(userStats)
        .map(([uid, stats], idx) => ({
            rank: 0,
            isCurrentUser: uid === user.id,
            handle: uid === user.id ? 'You' : `Trader#${String(idx + 1).padStart(3, '0')}`,
            winRate: stats.total ? Math.round((stats.wins / stats.total) * 100) : 0,
            profitFactor: stats.total && (stats.total - stats.wins) > 0
                ? parseFloat((stats.wins / (stats.total - stats.wins)).toFixed(2))
                : stats.wins > 0 ? 99 : 0,
            avgRR: stats.rr.length
                ? parseFloat((stats.rr.reduce((a, b) => a + b, 0) / stats.rr.length).toFixed(2))
                : 0,
            trades: stats.total,
            topGrade: stats.grade.includes('A+') ? 'A+' : stats.grade.includes('A') ? 'A' : 'B',
        }))
        .filter(u => u.trades >= 3)
        .sort((a, b) => (b.winRate * b.avgRR) - (a.winRate * a.avgRR))
        .slice(0, 20)
        .map((u, i) => ({ ...u, rank: i + 1 }))

    return <CommunityHub leaderboard={ranked} currentUserId={user.id} />
}
