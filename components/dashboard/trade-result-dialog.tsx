'use client'

import { useState, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, MinusCircle, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TradeResultDialogProps {
    tradeId: string
    pair: string
    currentResult?: string | null
    riskAmount?: number | null
    onUpdated?: () => void
    children?: React.ReactNode
}

const EMOTIONS = ['Confident', 'Disciplined', 'Nervous', 'FOMO', 'Revenge', 'Patient', 'Rushed', 'Calm']
const MISTAKES = ['Moved SL', 'Early Entry', 'No Checklist', 'Against Bias', 'Over-leveraged', 'Chased Price', 'Ignored News']
const SESSIONS = ['London', 'New York', 'Asia', 'London/NY Overlap', 'Pre-Market', 'After Hours']

export function TradeResultDialog({
    tradeId,
    pair,
    currentResult,
    riskAmount,
    onUpdated,
    children,
}: TradeResultDialogProps) {
    const [open, setOpen] = useState(false)
    const [result, setResult] = useState<'win' | 'loss' | 'breakeven' | ''>(
        (currentResult as 'win' | 'loss' | 'breakeven') || ''
    )
    const [rrActual, setRrActual] = useState('')
    const [notes, setNotes] = useState('')
    const [emotion, setEmotion] = useState('')
    const [session, setSession] = useState('')
    const [selectedMistakes, setSelectedMistakes] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()

    const supabase = createClient()

    const toggleMistake = (m: string) =>
        setSelectedMistakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

    const pl = result === 'win'
        ? (Number(riskAmount) || 0) * (Number(rrActual) || 1)
        : result === 'loss'
            ? -(Number(riskAmount) || 0)
            : 0

    const handleSubmit = () => {
        if (!result) return toast.error('Please select a result')
        startTransition(async () => {
            const { error } = await supabase
                .from('trades')
                .update({
                    result,
                    rr: Number(rrActual) || null,
                    notes: notes || null,
                    session: session || null,
                    mistake: selectedMistakes.length > 0 ? selectedMistakes : null,
                    emotions: emotion || null,
                })
                .eq('id', tradeId)

            if (error) {
                toast.error('Failed to update trade')
                return
            }
            toast.success(`Trade logged as ${result.toUpperCase()}`)
            setOpen(false)
            onUpdated?.()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ?? (
                    <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 text-xs">
                        <PenLine className="h-3.5 w-3.5" />
                        Log Result
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-[oklch(0.19_0.016_248)] text-foreground sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Log Trade Result</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Record the outcome for <strong className="text-foreground">{pair}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Result selector */}
                    <div className="space-y-2">
                        <Label>Result</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['win', 'loss', 'breakeven'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setResult(r)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all',
                                        result === r
                                            ? r === 'win' ? 'border-profit/60 bg-profit/15 text-profit'
                                                : r === 'loss' ? 'border-loss/60 bg-loss/15 text-loss'
                                                    : 'border-primary/60 bg-primary/15 text-primary'
                                            : 'border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:bg-white/6'
                                    )}
                                >
                                    {r === 'win' ? <CheckCircle className="h-4 w-4" />
                                        : r === 'loss' ? <XCircle className="h-4 w-4" />
                                            : <MinusCircle className="h-4 w-4" />}
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RR + P/L */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="rr">Actual R:R</Label>
                            <Input
                                id="rr"
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="e.g. 2.5"
                                value={rrActual}
                                onChange={e => setRrActual(e.target.value)}
                                className="border-white/10 bg-white/5"
                            />
                        </div>
                        {result && (
                            <div className="space-y-2">
                                <Label>Estimated P/L</Label>
                                <div className={cn(
                                    'flex h-10 items-center rounded-xl border px-3 text-sm font-semibold',
                                    pl > 0 ? 'border-profit/40 bg-profit/10 text-profit'
                                        : pl < 0 ? 'border-loss/40 bg-loss/10 text-loss'
                                            : 'border-white/10 bg-white/5 text-muted-foreground'
                                )}>
                                    {pl > 0 ? '+' : ''}{pl.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Session */}
                    <div className="space-y-2">
                        <Label>Session</Label>
                        <Select value={session} onValueChange={setSession}>
                            <SelectTrigger className="border-white/10 bg-white/5">
                                <SelectValue placeholder="Select session" />
                            </SelectTrigger>
                            <SelectContent>
                                {SESSIONS.map(s => (
                                    <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, '_')}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Emotions */}
                    <div className="space-y-2">
                        <Label>Emotional State</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {EMOTIONS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setEmotion(emotion === e ? '' : e)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-xs transition-all',
                                        emotion === e
                                            ? 'border-primary/60 bg-primary/15 text-primary'
                                            : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                    )}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mistakes */}
                    <div className="space-y-2">
                        <Label>Mistakes (optional)</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {MISTAKES.map(m => (
                                <button
                                    key={m}
                                    onClick={() => toggleMistake(m)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-xs transition-all',
                                        selectedMistakes.includes(m)
                                            ? 'border-loss/60 bg-loss/15 text-loss'
                                            : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Post-Trade Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="What did you do well? What would you improve next time?"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="min-h-[80px] border-white/10 bg-white/5 text-sm"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending || !result}>
                        {isPending ? 'Saving…' : 'Save Result'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
