import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { CommunityHub } from '@/components/dashboard/community-hub'

export default async function CommunityPage() {
    const user = await getAuthenticatedUser()
    if (!user) redirect('/auth/login')

    const supabase = await createClient()

    // Fetch anonymized leaderboard data
    const { data: leaderboard } = await supabase
        .from('trades')
        .select('user_id, result, rr, setup_grade, created_at')
        .not('result', 'eq', 'pending')
        .order('created_at', { ascending: false })
        .limit(500)

    const userStats: Record<string, { wins: number; total: number; rr: number[]; grade: string[] }> = {}

    for (const trade of leaderboard || []) {
        if (!userStats[trade.user_id]) {
            userStats[trade.user_id] = { wins: 0, total: 0, rr: [], grade: [] }
        }
        const u = userStats[trade.user_id]
        u.total++
        if (trade.result === 'win') u.wins++
        if (trade.rr) u.rr.push(trade.rr)
        if (trade.setup_grade) u.grade.push(trade.setup_grade)
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
