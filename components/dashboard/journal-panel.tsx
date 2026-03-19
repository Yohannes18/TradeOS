'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, Minus, TrendingDown, TrendingUp, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { normalizeSessionValue, sessionLabel, SESSION_LABELS, SESSION_VALUES } from '@/lib/session'
import type { SessionValue, SessionValueOrUnknown } from '@/lib/session'

export interface Trade {
    id: string
    pair: string
    score: number | null
    checklist_score?: number | null
    setup_grade?: 'A' | 'B' | 'C' | null
    bias: 'bullish' | 'bearish' | 'neutral' | null
    fundamental_bias?: string | null
    session?: SessionValue | null
    entry: number | null
    sl: number | null
    tp: number | null
    rr?: number | null
    trade_date?: string | null
    mistake?: string[] | null
    emotion?: string | null
    result: 'win' | 'loss' | 'breakeven' | 'pending' | null
    notes: string | null
    created_at: string
}

interface JournalPanelProps {
    userId: string
    initialTrades: Trade[]
}

interface ChecklistLog {
    id: string
    context_score: number | null
    setup_score: number | null
    execution_score: number | null
    total_score: number | null
    data?: {
        regime?: string
        session?: string
        fundamentalAligned?: boolean
        highImpactNewsNearby?: boolean
    } | null
}

export function JournalPanel({ userId, initialTrades }: JournalPanelProps) {
    const [trades, setTrades] = useState(initialTrades)
    const [pairFilter, setPairFilter] = useState('all')
    const [resultFilter, setResultFilter] = useState('all')
    const [sessionFilter, setSessionFilter] = useState<'all' | SessionValueOrUnknown>('all')
    const [scoreFilter, setScoreFilter] = useState('all')
    const [mistakeFilter, setMistakeFilter] = useState('all')
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
    const [selectedChecklist, setSelectedChecklist] = useState<ChecklistLog | null>(null)
    const [isChecklistLoading, setIsChecklistLoading] = useState(false)
    const supabase = createClient()

    const getEffectiveScore = (trade: Trade) => trade.checklist_score ?? trade.score ?? 0

    const getSessionKey = (trade: Trade) => normalizeSessionValue(trade.session, trade.notes)

    const hasMistakeTag = (trade: Trade) => {
        if (Array.isArray(trade.mistake) && trade.mistake.length > 0) return true
        return (trade.notes || '').toLowerCase().includes('mistake')
    }

    const pairs = useMemo(() => Array.from(new Set(trades.map((trade) => trade.pair))).sort(), [trades])

    const filteredTrades = useMemo(() => {
        return trades.filter((trade) => {
            const score = getEffectiveScore(trade)
            const session = getSessionKey(trade)
            const hasMistake = hasMistakeTag(trade)

            if (pairFilter !== 'all' && trade.pair !== pairFilter) return false
            if (resultFilter !== 'all' && trade.result !== resultFilter) return false
            if (sessionFilter !== 'all' && session !== sessionFilter) return false
            if (mistakeFilter === 'mistake' && !hasMistake) return false
            if (mistakeFilter === 'clean' && hasMistake) return false

            if (scoreFilter === 'a' && score < 8) return false
            if (scoreFilter === 'b' && (score < 6 || score >= 8)) return false
            if (scoreFilter === 'c' && (score < 4 || score >= 6)) return false
            if (scoreFilter === 'no-trade' && score >= 4) return false

            return true
        })
    }, [trades, pairFilter, resultFilter, sessionFilter, scoreFilter, mistakeFilter])

    const sortedTrades = useMemo(
        () => [...filteredTrades].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
        [filteredTrades],
    )

    const getGrade = (score: number | null) => {
        const value = score || 0
        if (value >= 8) return 'A'
        if (value >= 6) return 'B'
        if (value >= 4) return 'C'
        return 'No Trade'
    }

    const getTradeGrade = (trade: Trade) => {
        if (trade.setup_grade === 'A' || trade.setup_grade === 'B' || trade.setup_grade === 'C') {
            return trade.setup_grade
        }
        return getGrade(getEffectiveScore(trade))
    }

    const getSession = (trade: Trade) => {
        return sessionLabel(getSessionKey(trade))
    }

    const getRR = (trade: Trade) => {
        if (typeof trade.rr === 'number' && !Number.isNaN(trade.rr)) {
            return `1:${trade.rr.toFixed(2)}`
        }
        if (!trade.entry || !trade.sl || !trade.tp) return '-'
        const risk = Math.abs(trade.entry - trade.sl)
        const reward = Math.abs(trade.tp - trade.entry)
        if (!risk) return '-'
        return `1:${(reward / risk).toFixed(2)}`
    }

    const handleResultChange = async (tradeId: string, result: 'win' | 'loss' | 'breakeven') => {
        const { error } = await supabase
            .from('trades')
            .update({ result })
            .eq('id', tradeId)
            .eq('user_id', userId)

        if (error) {
            toast.error('Failed to update result')
            return
        }

        setTrades((prev) => prev.map((trade) => (trade.id === tradeId ? { ...trade, result } : trade)))
        toast.success('Trade result updated')
    }

    const getResultBadge = (result: Trade['result']) => {
        switch (result) {
            case 'win':
                return (
                    <Badge className="bg-profit/10 text-profit border-profit/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Win
                    </Badge>
                )
            case 'loss':
                return (
                    <Badge className="bg-loss/10 text-loss border-loss/20">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Loss
                    </Badge>
                )
            case 'breakeven':
                return (
                    <Badge className="bg-muted text-muted-foreground">
                        <Minus className="h-3 w-3 mr-1" />
                        BE
                    </Badge>
                )
            default:
                return (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                )
        }
    }

    useEffect(() => {
        const loadChecklist = async () => {
            if (!selectedTrade?.id) {
                setSelectedChecklist(null)
                return
            }

            setIsChecklistLoading(true)
            const { data, error } = await supabase
                .from('checklist_logs')
                .select('id, context_score, setup_score, execution_score, total_score, data')
                .eq('user_id', userId)
                .eq('trade_id', selectedTrade.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) {
                setSelectedChecklist(null)
                setIsChecklistLoading(false)
                return
            }

            setSelectedChecklist((data as ChecklistLog | null) || null)
            setIsChecklistLoading(false)
        }

        loadChecklist()
    }, [selectedTrade?.id, supabase, userId])

    return (
        <div className="h-full grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="border-border bg-card xl:col-span-2">
                <CardHeader className="pb-3 space-y-3">
                    <CardTitle className="text-base">Post-Trade Journal</CardTitle>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        <Select value={pairFilter} onValueChange={setPairFilter}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Pair" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Pairs</SelectItem>
                                {pairs.map((pair) => (
                                    <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={resultFilter} onValueChange={setResultFilter}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Result" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Results</SelectItem>
                                <SelectItem value="win">Win</SelectItem>
                                <SelectItem value="loss">Loss</SelectItem>
                                <SelectItem value="breakeven">Breakeven</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={scoreFilter} onValueChange={setScoreFilter}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Score" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Scores</SelectItem>
                                <SelectItem value="a">A Setups</SelectItem>
                                <SelectItem value="b">B Setups</SelectItem>
                                <SelectItem value="c">C Setups</SelectItem>
                                <SelectItem value="no-trade">No Trade</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sessionFilter} onValueChange={(value) => setSessionFilter(value as 'all' | SessionValueOrUnknown)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Session" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sessions</SelectItem>
                                {SESSION_VALUES.map((session) => (
                                    <SelectItem key={session} value={session}>{SESSION_LABELS[session]}</SelectItem>
                                ))}
                                <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={mistakeFilter} onValueChange={setMistakeFilter}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Mistake" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Notes</SelectItem>
                                <SelectItem value="mistake">With Mistakes</SelectItem>
                                <SelectItem value="clean">No Mistake Tag</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead>Date</TableHead>
                                <TableHead>Pair</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Bias</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>RR</TableHead>
                                <TableHead>Session</TableHead>
                                <TableHead>Update Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTrades.slice(0, 50).map((trade) => (
                                <TableRow
                                    key={trade.id}
                                    className="border-border cursor-pointer"
                                    onClick={() => setSelectedTrade(trade)}
                                >
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(trade.trade_date || trade.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{trade.pair}</TableCell>
                                    <TableCell>{Math.round(getEffectiveScore(trade))}/10</TableCell>
                                    <TableCell>{getTradeGrade(trade)}</TableCell>
                                    <TableCell className="capitalize">{trade.fundamental_bias ?? trade.bias ?? '-'}</TableCell>
                                    <TableCell>{getResultBadge(trade.result)}</TableCell>
                                    <TableCell>{getRR(trade)}</TableCell>
                                    <TableCell>{getSession(trade)}</TableCell>
                                    <TableCell>
                                        {trade.result === 'pending' ? (
                                            <div className="flex items-center gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-profit" onClick={() => handleResultChange(trade.id, 'win')}>
                                                    Win
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-loss" onClick={() => handleResultChange(trade.id, 'loss')}>
                                                    Loss
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleResultChange(trade.id, 'breakeven')}>
                                                    BE
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                Reviewed
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-border bg-card xl:col-span-1">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Trade Detail
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {selectedTrade ? (
                        <>
                            <p><span className="text-muted-foreground">Pair:</span> <span className="font-medium">{selectedTrade.pair}</span></p>
                            <p><span className="text-muted-foreground">Date:</span> {new Date(selectedTrade.trade_date || selectedTrade.created_at).toLocaleString()}</p>
                            <p><span className="text-muted-foreground">Score / Grade:</span> {Math.round(getEffectiveScore(selectedTrade))} / {getTradeGrade(selectedTrade)}</p>
                            <p><span className="text-muted-foreground">Bias:</span> {selectedTrade.fundamental_bias ?? selectedTrade.bias ?? '-'}</p>
                            <p><span className="text-muted-foreground">RR:</span> {getRR(selectedTrade)}</p>
                            <p><span className="text-muted-foreground">Session:</span> {getSession(selectedTrade)}</p>

                            <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Notes / Mistakes / Emotion</p>
                                <p>{selectedTrade.notes || 'No notes captured.'}</p>
                                {Array.isArray(selectedTrade.mistake) && selectedTrade.mistake.length > 0 && (
                                    <p className="mt-1">Mistakes: {selectedTrade.mistake.join(', ')}</p>
                                )}
                                {selectedTrade.emotion && <p className="mt-1">Emotion: {selectedTrade.emotion}</p>}
                            </div>

                            <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">AI Summary</p>
                                <p>
                                    {getEffectiveScore(selectedTrade) >= 8
                                        ? 'High-quality setup. Focus on repeating this structure with macro alignment.'
                                        : 'Below A-tier setup. Review timing, context alignment, and execution precision.'}
                                </p>
                            </div>

                            <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Checklist Link</p>
                                {isChecklistLoading ? (
                                    <p>Loading linked checklist…</p>
                                ) : selectedChecklist ? (
                                    <div className="space-y-1">
                                        <p>
                                            Scores — Context: {selectedChecklist.context_score?.toFixed(2) ?? '-'} | Setup: {selectedChecklist.setup_score?.toFixed(2) ?? '-'} | Execution: {selectedChecklist.execution_score?.toFixed(2) ?? '-'} | Total: {selectedChecklist.total_score ?? '-'}
                                        </p>
                                        <p>
                                            Regime: {selectedChecklist.data?.regime || '-'} | Session: {selectedChecklist.data?.session || '-'}
                                        </p>
                                        <p>
                                            Fundamental aligned: {selectedChecklist.data?.fundamentalAligned ? 'Yes' : 'No'} | High-impact news nearby: {selectedChecklist.data?.highImpactNewsNearby ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                ) : (
                                    <p>No checklist log linked to this trade yet.</p>
                                )}
                            </div>

                            <div className="rounded-md border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Chart Screenshot</p>
                                <p>Screenshot upload/annotation is planned in next iteration.</p>
                            </div>
                        </>
                    ) : (
                        <p className="text-muted-foreground">Select a trade row to view details.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
