'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const QUICK_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USTEC100', 'US500', 'USDJPY']

interface QuickAddTradeProps {
    userId: string
    accountBalance: number
    riskPercent: number
}

export function QuickAddTrade({ userId, accountBalance, riskPercent }: QuickAddTradeProps) {
    const [open, setOpen] = useState(false)
    const [pair, setPair] = useState('XAUUSD')
    const [entry, setEntry] = useState('')
    const [sl, setSl] = useState('')
    const [tp, setTp] = useState('')
    const [direction, setDirection] = useState<'buy' | 'sell'>('buy')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    void userId

    const riskAmount = (accountBalance * riskPercent) / 100
    const entryN = parseFloat(entry) || 0
    const slN = parseFloat(sl) || 0
    const tpN = parseFloat(tp) || 0
    const slDist = entryN && slN ? Math.abs(entryN - slN) : 0
    const tpDist = entryN && tpN ? Math.abs(tpN - entryN) : 0
    const rr = slDist > 0 ? tpDist / slDist : 0

    const handleSubmit = () => {
        if (!pair || !entry || !sl) {
            toast.error('Please fill in pair, entry, and stop loss')
            return
        }
        startTransition(async () => {
            const preTradeResponse = await fetch('/api/pre-trade', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    pair,
                    entry: entryN,
                    stop_loss: slN,
                    take_profit: tpN || entryN + Math.abs(entryN - slN) * 2,
                    risk_percent: riskPercent,
                    checklist: {
                        setup: {
                            thesisClear: true,
                            trendAligned: true,
                            liquidityMapped: true,
                            riskDefined: true,
                            rrAcceptable: rr >= 1,
                            sessionAligned: true,
                            newsClear: true,
                            disciplineReady: true,
                        },
                        aiContext: {
                            confidence: 0.85,
                            structureAlignment: direction === 'buy' ? 'aligned' : 'mixed',
                            regime: 'trend',
                        },
                        macroContext: {
                            biasAlignment: 'aligned',
                            eventRisk: 'low',
                            volatility: 'normal',
                            sessionQuality: 'good',
                        },
                        notes: 'Quick add trade.',
                    },
                }),
            })

            if (!preTradeResponse.ok) {
                const payload = await preTradeResponse.json().catch(() => null)
                toast.error(payload?.error || 'Failed to create pre-trade')
                return
            }

            const preTradePayload = await preTradeResponse.json()

            const executionResponse = await fetch('/api/execution', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ preTradeId: preTradePayload.preTrade.id }),
            })

            if (!executionResponse.ok) {
                const payload = await executionResponse.json().catch(() => null)
                toast.error(payload?.error || 'Failed to create execution')
                return
            }

            toast.success(`${pair} trade logged — review it in Journal`)
            setOpen(false)
            setEntry(''); setSl(''); setTp('')
            router.push('/dashboard/journal')
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Trade
                </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-[oklch(0.19_0.016_248)] text-foreground sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Quick Log Trade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Pair */}
                    <div className="space-y-2">
                        <Label>Instrument</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_PAIRS.map(p => (
                                <button key={p} onClick={() => setPair(p)}
                                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs transition-all',
                                        pair === p ? 'border-primary/60 bg-primary/15 text-primary' : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                    )}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Direction */}
                    <div className="space-y-2">
                        <Label>Direction</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['buy', 'sell'] as const).map(d => (
                                <button key={d} onClick={() => setDirection(d)}
                                    className={cn('rounded-xl border py-2.5 text-sm font-medium transition-all',
                                        direction === d
                                            ? d === 'buy' ? 'border-profit/60 bg-profit/15 text-profit' : 'border-loss/60 bg-loss/15 text-loss'
                                            : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                    )}>
                                    {d === 'buy' ? '▲ BUY / LONG' : '▼ SELL / SHORT'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="q-entry">Entry</Label>
                            <Input id="q-entry" type="number" step="any" placeholder="0.00" value={entry}
                                onChange={e => setEntry(e.target.value)} className="border-white/10 bg-white/5" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-sl">Stop Loss</Label>
                            <Input id="q-sl" type="number" step="any" placeholder="0.00" value={sl}
                                onChange={e => setSl(e.target.value)} className="border-white/10 bg-white/5" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-tp">Take Profit</Label>
                            <Input id="q-tp" type="number" step="any" placeholder="0.00" value={tp}
                                onChange={e => setTp(e.target.value)} className="border-white/10 bg-white/5" />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                            <p className="text-xs text-muted-foreground">Risk</p>
                            <p className="text-sm font-semibold text-loss">${riskAmount.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                            <p className="text-xs text-muted-foreground">R:R</p>
                            <p className={cn('text-sm font-semibold', rr >= 2 ? 'text-profit' : rr > 0 ? '' : 'text-muted-foreground')}>
                                {rr > 0 ? `1:${rr.toFixed(1)}` : '—'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                            <p className="text-xs text-muted-foreground">Potential</p>
                            <p className="text-sm font-semibold text-profit">
                                {rr > 0 ? `+$${(riskAmount * rr).toFixed(2)}` : '—'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={isPending}>
                            {isPending ? 'Logging…' : <><Plus className="h-4 w-4" /> Log Trade</>}
                        </Button>
                        <Button variant="outline" asChild className="border-white/10 bg-white/5">
                            <a href="/dashboard/trade"><ArrowRight className="h-4 w-4" /></a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
