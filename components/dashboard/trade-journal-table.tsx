'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TradeResultDialog } from '@/components/dashboard/trade-result-dialog'
import { cn } from '@/lib/utils'
import { Download, Plus, SortAsc, SortDesc, TrendingUp, TrendingDown, MinusCircle, X, FileText } from 'lucide-react'
import Link from 'next/link'

export interface JournalTradeRow {
    id: string
    created_at: string
    pair: string
    checklist_grade?: string | null
    risk_amount?: number | null
    position_size?: number | null
    entry?: number | null
    sl?: number | null
    tp?: number | null
    pl?: number | null
    rr?: number | null
    ai_bias?: string | null
    ai_recommendation?: string | null
    notes?: string | null
    result?: 'win' | 'loss' | 'breakeven' | 'pending' | null
    session?: string | null
    emotions?: string | null
}

interface TradeJournalTableProps {
    trades: JournalTradeRow[]
}

type SortKey = 'created_at' | 'pair' | 'risk_amount' | 'pl' | 'rr'

function ResultBadge({ result }: { result?: string | null }) {
    if (!result || result === 'pending') return <span className="text-xs text-muted-foreground">Pending</span>
    const map: Record<string, string> = {
        win: 'border-profit/40 bg-profit/10 text-profit',
        loss: 'border-loss/40 bg-loss/10 text-loss',
        breakeven: 'border-primary/40 bg-primary/10 text-primary',
    }
    const icons: Record<string, React.ReactNode> = {
        win: <TrendingUp className="h-3 w-3" />,
        loss: <TrendingDown className="h-3 w-3" />,
        breakeven: <MinusCircle className="h-3 w-3" />,
    }
    return (
        <Badge variant="outline" className={cn('gap-1 text-xs', map[result])}>
            {icons[result]}
            {result.charAt(0).toUpperCase() + result.slice(1)}
        </Badge>
    )
}

function GradeBadge({ grade }: { grade?: string | null }) {
    if (!grade) return <span className="text-xs text-muted-foreground">-</span>
    const color = grade === 'A+' ? 'border-profit/40 text-profit'
        : grade === 'A' ? 'border-emerald-500/40 text-emerald-400'
        : grade === 'B' ? 'border-blue-500/40 text-blue-400'
        : grade === 'F' ? 'border-loss/40 text-loss' : ''
    return <Badge variant="outline" className={cn('text-xs', color)}>{grade}</Badge>
}

function exportToCSV(trades: JournalTradeRow[]) {
    const headers = ['Date', 'Symbol', 'Result', 'Entry', 'SL', 'TP', 'RR', 'P/L', 'Grade', 'Session', 'Notes']
    const rows = trades.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        t.pair, t.result || 'pending',
        t.entry || '', t.sl || '', t.tp || '',
        t.rr?.toFixed(2) || '', t.pl?.toFixed(2) || '',
        t.checklist_grade || '', t.session || '',
        (t.notes || '').replace(/,/g, ';'),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tradeos-journal-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export function TradeJournalTable({ trades }: TradeJournalTableProps) {
    const [query, setQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [resultFilter, setResultFilter] = useState('all')
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const handleSort = useCallback((key: SortKey) => {
        if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortBy(key); setSortDir('desc') }
    }, [sortBy])

    const filtered = useMemo(() => {
        const base = trades.filter(t => {
            const q = query.toLowerCase()
            const matchQuery = t.pair.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)
            const matchResult = resultFilter === 'all' || t.result === resultFilter
                || (resultFilter === 'pending' && (!t.result || t.result === 'pending'))
            return matchQuery && matchResult
        })
        return base.sort((a, b) => {
            let cmp = 0
            if (sortBy === 'created_at') cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            else if (sortBy === 'pair') cmp = a.pair.localeCompare(b.pair)
            else if (sortBy === 'risk_amount') cmp = (b.risk_amount || 0) - (a.risk_amount || 0)
            else if (sortBy === 'pl') cmp = (b.pl || 0) - (a.pl || 0)
            else if (sortBy === 'rr') cmp = (b.rr || 0) - (a.rr || 0)
            return sortDir === 'asc' ? -cmp : cmp
        })
    }, [trades, query, sortBy, sortDir, resultFilter])

    const selected = filtered.find(t => t.id === selectedId) || null
    const completed = trades.filter(t => t.result && t.result !== 'pending')
    const wins = completed.filter(t => t.result === 'win').length
    const winRate = completed.length ? Math.round(wins / completed.length * 100) : 0
    const netPL = completed.reduce((s, t) => s + (t.pl || 0), 0)
    const rrList = completed.filter(t => t.rr)
    const avgRR = rrList.length ? rrList.reduce((s, t) => s + (t.rr || 0), 0) / rrList.length : 0

    const SortIcon = ({ k }: { k: SortKey }) =>
        sortBy === k ? (sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : null

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: 'Win Rate', value: `${winRate}%`, tone: winRate >= 55 ? 'profit' : winRate >= 45 ? '' : 'loss' },
                    { label: 'Net P/L', value: `${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}`, tone: netPL >= 0 ? 'profit' : 'loss' },
                    { label: 'Avg R:R', value: avgRR ? avgRR.toFixed(2) : 'N/A', tone: '' },
                    { label: 'Total Trades', value: String(trades.length), tone: '' },
                ].map(s => (
                    <div key={s.label} className="glass-panel rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={cn('mt-1 text-xl font-semibold', s.tone === 'profit' ? 'text-profit' : s.tone === 'loss' ? 'text-loss' : '')}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <Card className="glass-panel min-w-0">
                    <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-lg">Trade Journal</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Input value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="Search…" className="h-9 w-full border-white/10 bg-white/5 sm:w-44" />
                            <select className="h-9 rounded-lg border border-white/10 bg-card px-2 text-sm"
                                value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
                                <option value="all">All</option>
                                <option value="win">Wins</option>
                                <option value="loss">Losses</option>
                                <option value="breakeven">Breakeven</option>
                                <option value="pending">Pending</option>
                            </select>
                            <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5"
                                onClick={() => exportToCSV(filtered)}>
                                <Download className="h-3.5 w-3.5" /> CSV
                            </Button>
                            <a href="/api/report" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5">
                                    <FileText className="h-3.5 w-3.5" /> Report
                                </Button>
                            </a>
                            <Link href="/dashboard/trade">
                                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/8">
                                    <TableHead className="pl-4">
                                        <button onClick={() => handleSort('created_at')} className="flex items-center gap-1">Date <SortIcon k="created_at" /></button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('pair')} className="flex items-center gap-1">Symbol <SortIcon k="pair" /></button>
                                    </TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('rr')} className="flex items-center gap-1">R:R <SortIcon k="rr" /></button>
                                    </TableHead>
                                    <TableHead>
                                        <button onClick={() => handleSort('pl')} className="flex items-center gap-1">P/L <SortIcon k="pl" /></button>
                                    </TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead className="pr-4">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                                            No trades found.{' '}
                                            <Link href="/dashboard/trade" className="text-primary hover:underline">Add your first trade →</Link>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map(trade => (
                                    <TableRow key={trade.id}
                                        onClick={() => setSelectedId(p => p === trade.id ? null : trade.id)}
                                        className={cn(
                                            'cursor-pointer border-white/6 transition-colors',
                                            trade.result === 'win' && 'bg-profit/4 hover:bg-profit/8',
                                            trade.result === 'loss' && 'bg-loss/4 hover:bg-loss/8',
                                            selectedId === trade.id && 'ring-1 ring-inset ring-primary/30',
                                        )}>
                                        <TableCell className="pl-4 text-xs text-muted-foreground">
                                            {new Date(trade.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </TableCell>
                                        <TableCell className="font-medium">{trade.pair}</TableCell>
                                        <TableCell><GradeBadge grade={trade.checklist_grade} /></TableCell>
                                        <TableCell className="text-sm">{trade.rr ? `${trade.rr.toFixed(1)}R` : '-'}</TableCell>
                                        <TableCell className={cn('text-sm font-medium', (trade.pl || 0) > 0 ? 'text-profit' : (trade.pl || 0) < 0 ? 'text-loss' : '')}>
                                            {trade.pl ? `${trade.pl > 0 ? '+' : ''}${trade.pl.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell><ResultBadge result={trade.result} /></TableCell>
                                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                            <TradeResultDialog tradeId={trade.id} pair={trade.pair}
                                                currentResult={trade.result} riskAmount={trade.risk_amount}
                                                onUpdated={() => window.location.reload()} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Detail panel */}
                <Card className="glass-panel h-fit">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base">Trade Detail</CardTitle>
                        {selected && <button onClick={() => setSelectedId(null)}><X className="h-4 w-4 text-muted-foreground" /></button>}
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {selected ? (
                            <>
                                <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold">{selected.pair}</span>
                                        <ResultBadge result={selected.result} />
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['Entry', selected.entry?.toFixed(5)], ['SL', selected.sl?.toFixed(5)], ['TP', selected.tp?.toFixed(5)]].map(([label, val]) => (
                                        <div key={label} className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className="mt-0.5 text-xs font-medium">{val || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                                {(selected.rr || selected.pl) && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                                            <p className="text-xs text-muted-foreground">R:R</p>
                                            <p className="mt-0.5 font-semibold">{selected.rr ? `${selected.rr.toFixed(2)}R` : '-'}</p>
                                        </div>
                                        <div className="rounded-lg border border-white/8 bg-white/4 p-2 text-center">
                                            <p className="text-xs text-muted-foreground">P/L</p>
                                            <p className={cn('mt-0.5 font-semibold', (selected.pl || 0) > 0 ? 'text-profit' : 'text-loss')}>
                                                {selected.pl ? `${selected.pl > 0 ? '+' : ''}${selected.pl.toFixed(2)}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                                    <p className="text-xs font-medium">AI Signal</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Bias: <span className="text-foreground">{selected.ai_bias || 'NEUTRAL'}</span>
                                        {' · '}Action: <span className="text-foreground">{selected.ai_recommendation || 'WAIT'}</span>
                                    </p>
                                </div>
                                {selected.notes && (
                                    <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                                        <p className="text-xs font-medium">Notes</p>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.notes}</p>
                                    </div>
                                )}
                                <TradeResultDialog tradeId={selected.id} pair={selected.pair}
                                    currentResult={selected.result} riskAmount={selected.risk_amount}
                                    onUpdated={() => window.location.reload()}>
                                    <Button variant="outline" size="sm" className="w-full border-white/10 bg-white/5">Update Result</Button>
                                </TradeResultDialog>
                            </>
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">Click a trade to view details</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
