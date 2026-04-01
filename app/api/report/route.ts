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

    const { data: trades } = await supabase
        .from('trades')
        .select('id, created_at, pair, result, rr, risk_amount, setup_grade, notes, session, emotions, entry, sl, tp, ai_recommendation')
        .eq('user_id', user.id)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59')
        .order('created_at', { ascending: false })

    const list = trades || []
    const completed = list.filter(t => t.result && t.result !== 'pending')
    const wins = completed.filter(t => t.result === 'win').length
    const losses = completed.filter(t => t.result === 'loss').length
    const winRate = completed.length ? Math.round(wins / completed.length * 100) : 0
    const netPL = completed.reduce((s, t) => s + (t.result === 'win' ? (t.risk_amount || 0) * (t.rr || 1) : t.result === 'loss' ? -(t.risk_amount || 0) : 0), 0)
    const avgRR = completed.filter(t => t.rr).length ? (completed.filter(t => t.rr).reduce((s, t) => s + (t.rr || 0), 0) / completed.filter(t => t.rr).length) : 0
    const pf = losses ? (wins / losses).toFixed(2) : wins ? '∞' : '0.00'

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
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; padding: 32px; }
  h1 { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 28px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
  .stat { background: #1e2433; border: 1px solid #2d3748; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
  .stat-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .profit { color: #4ade80; }
  .loss { color: #f87171; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1a2035; color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; padding: 10px 12px; text-align: left; border-bottom: 1px solid #2d3748; }
  td { padding: 9px 12px; border-bottom: 1px solid #1e2433; vertical-align: top; }
  tr:hover td { background: #1a2035; }
  .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #475569; }
</style>
</head>
<body>
  <h1>TradeOS Performance Report</h1>
  <div class="subtitle">${from} → ${to} · Generated ${new Date().toLocaleString()}</div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Win Rate</div><div class="stat-value ${winRate >= 55 ? 'profit' : winRate >= 45 ? '' : 'loss'}">${winRate}%</div></div>
    <div class="stat"><div class="stat-label">Net P/L</div><div class="stat-value ${netPL >= 0 ? 'profit' : 'loss'}">${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}</div></div>
    <div class="stat"><div class="stat-label">Profit Factor</div><div class="stat-value">${pf}</div></div>
    <div class="stat"><div class="stat-label">Avg R:R</div><div class="stat-value">${avgRR.toFixed(2)}</div></div>
    <div class="stat"><div class="stat-label">Total Trades</div><div class="stat-value">${list.length}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Symbol</th><th>Result</th><th>Grade</th><th>R:R</th><th>P/L</th><th>Session</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">TradeOS Pro · Not financial advice · For personal review only</div>
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="tradeos-report-${from}-${to}.html"`,
        },
    })
}
