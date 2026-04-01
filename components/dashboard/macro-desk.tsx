import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CARDS = [
    { label: 'US10Y', value: '4.31%', delta: '+5bps' },
    { label: 'DXY', value: '103.40', delta: '-0.18%' },
    { label: 'US2Y', value: '4.55%', delta: '+3bps' },
    { label: 'Gold', value: '$2,184', delta: '+0.9%' },
    { label: 'S&P500', value: '5,227', delta: '+0.4%' },
    { label: 'NAS100', value: '18,194', delta: '+0.6%' },
    { label: 'Oil', value: '$79.20', delta: '-0.3%' },
    { label: 'Sentiment Index', value: '61', delta: 'Risk-On' },
    { label: 'Fundamental Pulse', value: 'Balanced', delta: 'Mixed' },
]

export function MacroDesk() {
    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CARDS.map((card) => (
                <Card key={card.label} className="glass-panel interactive-panel">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                        <div className="border-t border-white/10 pt-2 text-xs text-muted-foreground">{card.delta}</div>
                    </CardContent>
                </Card>
            ))}
        </section>
    )
}
