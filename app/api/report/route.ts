import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export async function GET(req: NextRequest) {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = searchParams.get('to') || new Date().toISOString().slice(0, 10)

    const { data: executions } = await supabase
        .from('executions')
        .select('id, pre_trade_id, created_at, executed_at, closed_at, entry, stop_loss, take_profit, risk_percent, position_size, status')
        .eq('user_id', user.id)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59')
        .order('created_at', { ascending: false })

    const { data: preTrades } = await supabase
        .from('pre_trades')
        .select('id, pair, final_score, ai_verdict')
        .eq('user_id', user.id)

    const { data: metrics } = await supabase
        .from('trade_metrics')
        .select('execution_id, rr_ratio, pnl, win_loss')
        .in('execution_id', ((executions || []) as { id: string }[]).map((row) => row.id))

    const { data: journals } = await supabase
        .from('journals')
        .select('execution_id, emotions, mistakes, adherence_score, notes, created_at')
        .eq('user_id', user.id)

    const preTradeMap = new Map(((preTrades || []) as { id: string; pair: string; final_score: number | null; ai_verdict: string }[]).map((row) => [row.id, row]))
    const metricMap = new Map(((metrics || []) as { execution_id: string; rr_ratio: number; pnl: number; win_loss: 'win' | 'loss' | 'breakeven' }[]).map((row) => [row.execution_id, row]))
    const journalMap = new Map(((journals || []) as { execution_id: string; emotions: string[]; mistakes: string[]; adherence_score: number; notes: string | null; created_at: string }[]).map((row) => [row.execution_id, row]))

    const list = ((executions || []) as { id: string; pre_trade_id: string; created_at: string; executed_at: string; closed_at: string | null; entry: number; stop_loss: number; take_profit: number; risk_percent: number; position_size: number; status: string }[]).map((execution) => {
        const preTrade = preTradeMap.get(execution.pre_trade_id)
        const metric = metricMap.get(execution.id)
        const journal = journalMap.get(execution.id)
        return {
            id: execution.id,
            pair: preTrade?.pair || 'UNKNOWN',
            result: metric?.win_loss || 'pending',
            rr: metric?.rr_ratio ?? null,
            risk_amount: Number(execution.position_size || 0) * Math.abs(Number(execution.entry || 0) - Number(execution.stop_loss || 0)),
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
            notes: journal?.notes || null,
            session: null,
            emotions: journal?.emotions || [],
            entry: execution.entry,
            sl: execution.stop_loss,
            tp: execution.take_profit,
            ai_recommendation: preTrade?.ai_verdict || null,
            created_at: execution.closed_at || execution.executed_at || execution.created_at,
        }
    })
    const completed = list.filter(t => t.result && t.result !== 'pending')
    const wins = completed.filter(t => t.result === 'win').length
    const losses = completed.filter(t => t.result === 'loss').length
    const winRate = completed.length ? Math.round(wins / completed.length * 100) : 0
    const netPL = completed.reduce((s, t) => s + (t.result === 'win' ? (t.risk_amount || 0) * (t.rr || 1) : t.result === 'loss' ? -(t.risk_amount || 0) : 0), 0)
    const avgRR = completed.filter(t => t.rr).length ? (completed.filter(t => t.rr).reduce((s, t) => s + (t.rr || 0), 0) / completed.filter(t => t.rr).length) : 0
    const pf = losses ? (wins / losses).toFixed(2) : wins ? '∞' : '0.00'
    const topPair = list.reduce<Record<string, number>>((acc, trade) => {
        acc[trade.pair] = (acc[trade.pair] || 0) + 1
        return acc
    }, {})
    const favoritePair = Object.entries(topPair).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    const bestGrade = list.some((trade) => trade.setup_grade === 'A+') ? 'A+' : list.some((trade) => trade.setup_grade === 'A') ? 'A' : 'B'

    // Build HTML report
    const rows = list.map(t => {
        const pl = t.result === 'win' ? (t.risk_amount || 0) * (t.rr || 1) : t.result === 'loss' ? -(t.risk_amount || 0) : 0
        const plColor = pl > 0 ? '#4ade80' : pl < 0 ? '#f87171' : '#9ca3af'
        const resultColor = t.result === 'win' ? '#4ade80' : t.result === 'loss' ? '#f87171' : '#9ca3af'
        return `<tr>
            <td>${new Date(t.created_at).toLocaleDateString('en-GB')}</td>
            <td><b>${t.pair}</b></td>
            <td style="color:${resultColor}">${(t.result || 'pending').toUpperCase()}</td>
            <td>${t.setup_grade || '—'}</td>
            <td>${t.rr ? t.rr.toFixed(2) + 'R' : '—'}</td>
            <td style="color:${plColor}">${pl !== 0 ? (pl > 0 ? '+' : '') + pl.toFixed(2) : '—'}</td>
            <td>${(t.session || '—').replace(/_/g, ' ')}</td>
            <td style="max-width:200px;white-space:normal">${(t.notes || '').slice(0, 80)}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TradeOS Report — ${from} to ${to}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, 'Segoe UI', sans-serif; background:
        radial-gradient(circle at top right, rgba(95,230,184,0.12), transparent 22%),
        radial-gradient(circle at 18% 16%, rgba(108,158,255,0.14), transparent 24%),
        #0b1020; color: #e2e8f0; padding: 32px; }
    .shell { max-width: 1200px; margin: 0 auto; }
    .hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -0.03em; }
    .subtitle { color: #94a3b8; font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .stat { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; backdrop-filter: blur(16px); }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; }
    .stat-value { font-size: 24px; font-weight: 700; margin-top: 6px; color: #fff; }
    .profit { color: #6ee7b7; }
    .loss { color: #f87171; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .meta-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px 16px; }
    .meta-card span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 6px; }
    .meta-card strong { font-size: 18px; color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; overflow: hidden; border-radius: 18px; }
    thead th { background: rgba(255,255,255,0.06); color: #cbd5e1; text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
    tbody td { padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; background: rgba(255,255,255,0.02); }
    tbody tr:hover td { background: rgba(255,255,255,0.05); }
    .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
    <div class="shell">
    <div class="hero">
        <div>
            <p class="subtitle">TradeOS Performance Report</p>
            <h1>Trade review with workflow context.</h1>
            <div class="subtitle">${from} → ${to} · Generated ${new Date().toLocaleString()}</div>
        </div>
        <div class="meta" style="margin:0; min-width: 320px;">
            <div class="meta-card"><span>Favorite Pair</span><strong>${favoritePair}</strong></div>
            <div class="meta-card"><span>Best Grade</span><strong>${bestGrade}</strong></div>
        </div>
    </div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Win Rate</div><div class="stat-value ${winRate >= 55 ? 'profit' : winRate >= 45 ? '' : 'loss'}">${winRate}%</div></div>
    <div class="stat"><div class="stat-label">Net P/L</div><div class="stat-value ${netPL >= 0 ? 'profit' : 'loss'}">${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}</div></div>
    <div class="stat"><div class="stat-label">Profit Factor</div><div class="stat-value">${pf}</div></div>
    <div class="stat"><div class="stat-label">Avg R:R</div><div class="stat-value">${avgRR.toFixed(2)}</div></div>
  </div>
    <div class="meta">
        <div class="meta-card"><span>Total Trades</span><strong>${list.length}</strong></div>
        <div class="meta-card"><span>Completed Trades</span><strong>${completed.length}</strong></div>
    </div>
  <table>
    <thead><tr><th>Date</th><th>Symbol</th><th>Result</th><th>Grade</th><th>R:R</th><th>P/L</th><th>Session</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">TradeOS Pro · Not financial advice · For personal review only</div>
    </div>
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="tradeos-report-${from}-${to}.html"`,
        },
    })
}
