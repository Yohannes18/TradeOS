import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TradeJournalTable } from '@/components/dashboard/trade-journal-table'
import type { JournalTradeRow } from '@/components/dashboard/trade-journal-table'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

interface ExecutionRow {
    id: string
    pre_trade_id: string
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
    final_score: number | null
    ai_verdict: string
}

interface MetricsRow {
    execution_id: string
    rr_ratio: number
    pnl: number
    win_loss: 'win' | 'loss' | 'breakeven'
}

interface JournalRow {
    execution_id: string
    emotions: string[]
    mistakes: string[]
    adherence_score: number
    notes: string | null
}

const scoreToGrade = (score: number | null) => {
    if (!score) return 'F'
    if (score >= 0.9) return 'A+'
    if (score >= 0.84) return 'A'
    if (score >= 0.76) return 'A-'
    if (score >= 0.65) return 'B'
    return 'F'
}

export default async function JournalPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const [{ data: executions }, { data: preTrades }, { data: journals }] = await Promise.all([
        supabase
            .from('executions')
            .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit, risk_percent, position_size, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(300),
        supabase
            .from('pre_trades')
            .select('id, pair, created_at, final_score, ai_verdict')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(300),
        supabase
            .from('journals')
            .select('execution_id, emotions, mistakes, adherence_score, notes')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
    ])

    const executionIds = ((executions || []) as ExecutionRow[]).map((row) => row.id)
    const { data: metricRows } = executionIds.length
        ? await supabase
            .from('trade_metrics')
            .select('execution_id, rr_ratio, pnl, win_loss')
            .in('execution_id', executionIds)
        : { data: [] }

    const preTradeMap = new Map(((preTrades || []) as PreTradeRow[]).map((row) => [row.id, row]))
    const metricMap = new Map(((metricRows || []) as MetricsRow[]).map((row) => [row.execution_id, row]))
    const journalMap = new Map(((journals || []) as JournalRow[]).map((row) => [row.execution_id, row]))

    const trades: JournalTradeRow[] = ((executions || []) as ExecutionRow[]).map((execution) => {
        const preTrade = preTradeMap.get(execution.pre_trade_id)
        const metric = metricMap.get(execution.id)
        const journal = journalMap.get(execution.id)
        const result: JournalTradeRow['result'] = metric?.win_loss ?? (execution.status === 'closed' ? 'breakeven' : 'pending')

        return {
            id: execution.id,
            created_at: execution.closed_at || execution.executed_at || execution.created_at,
            pair: preTrade?.pair || 'UNKNOWN',
            checklist_grade: scoreToGrade(preTrade?.final_score ?? null),
            risk_amount: Number(execution.position_size || 0) * Math.abs(Number(execution.entry || 0) - Number(execution.stop_loss || 0)),
            position_size: execution.position_size,
            entry: execution.entry,
            sl: execution.stop_loss,
            tp: execution.take_profit,
            rr: metric?.rr_ratio ?? null,
            pl: metric?.pnl ?? null,
            ai_bias: preTrade?.ai_verdict || null,
            ai_recommendation: preTrade?.ai_verdict || 'STANDBY',
            notes: journal?.notes || null,
            result,
            session: null,
            emotions: journal?.emotions ? journal.emotions.join(', ') : null,
        }
    })

    const completed = trades.filter((trade) => trade.result && trade.result !== 'pending')
    const winRate = completed.length ? Math.round((completed.filter((trade) => trade.result === 'win').length / completed.length) * 100) : 0
    const avgRR = completed.length
        ? (completed.reduce((sum, trade) => sum + (trade.rr || 0), 0) / completed.filter((trade) => trade.rr !== null).length || 0).toFixed(2)
        : '0.00'
    const bestGrade = trades.find((trade) => trade.checklist_grade)?.checklist_grade || 'N/A'

    return (
        <div className="page-wrap overflow-auto pb-8">
            <section className="page-hero px-6 py-7 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(95,230,184,0.14),transparent_22%),radial-gradient(circle_at_22%_18%,rgba(108,158,255,0.14),transparent_22%)]" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-primary">Journal</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Review the execution trail, not just the outcome.</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                            The journal now reflects the locked workflow path, with results, adherence, and post-trade notes stitched together in one view.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
                        {[
                            { label: 'Completed', value: String(completed.length) },
                            { label: 'Win Rate', value: `${winRate}%` },
                            { label: 'Best Grade', value: bestGrade },
                        ].map((metric) => (
                            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="px-6 sm:px-8">
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Win Rate', value: `${winRate}%`, tone: winRate >= 55 ? 'profit' : winRate >= 45 ? 'neutral' : 'loss' },
                        { label: 'Avg RR', value: avgRR, tone: 'neutral' },
                        { label: 'Logged Trades', value: String(trades.length), tone: 'neutral' },
                    ].map((item) => (
                        <div key={item.label} className="glass-panel rounded-2xl border border-white/8 p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className={`mt-1 text-2xl font-semibold tracking-tight ${item.tone === 'profit' ? 'text-profit' : item.tone === 'loss' ? 'text-loss' : 'text-foreground'}`}>
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
                <TradeJournalTable trades={trades} />
            </div>
        </div>
    )
}