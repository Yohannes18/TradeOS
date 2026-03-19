import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, BarChart3, ShieldAlert, Target } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const totalTrades = trades?.length || 0
  const completed = (trades || []).filter((trade) => trade.result && trade.result !== 'pending')
  const wins = completed.filter((trade) => trade.result === 'win').length
  const losses = completed.filter((trade) => trade.result === 'loss').length
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0
  const avgScore = totalTrades > 0
    ? Math.round(((trades || []).reduce((acc, trade) => acc + (trade.score || 0), 0) / totalTrades) * 10) / 10
    : 0
  const bestSetup = (trades || []).reduce((best, trade) => {
    if ((trade.score || 0) > (best.score || 0)) return trade
    return best
  }, { pair: '-', score: 0 } as { pair: string; score?: number })
  const profitFactor = losses === 0 ? (wins > 0 ? '∞' : '0.00') : (wins / losses).toFixed(2)

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Win Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-profit">{winRate}%</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Profit Factor</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{profitFactor}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Trades</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalTrades}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Best Setup</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{bestSetup.pair} ({bestSetup.score || 0}/10)</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> AI Market Bias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Bias updates live in Trade → AI Analysis mode.</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Gold: Dynamic</Badge>
              <Badge variant="outline">Indices: Dynamic</Badge>
              <Badge variant="outline">Confidence: Dynamic</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>High-impact events and macro conflicts are shown in AI Analysis.</p>
            <p>Average checklist score this cycle: <span className="text-foreground font-medium">{avgScore}/10</span></p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Today’s Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Session focus: London / New York overlap.</p>
            <p>Plan: only A/B setups with macro alignment.</p>
            <p className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Avoid entries near high-impact releases.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
