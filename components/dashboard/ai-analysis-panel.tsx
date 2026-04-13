'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChecklistResult } from '@/lib/trading/types'
import { cn } from '@/lib/utils'
import { BrainCircuit, RefreshCw, ShieldAlert, Target, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from 'lucide-react'

interface AIAnalysis {
    bias: 'LONG' | 'SHORT' | 'NEUTRAL'
    confidence: number
    verdict: 'AUTHORIZED' | 'STANDBY' | 'INVALID'
    summary: string
    key_levels: string[]
    risk_note: string
    improvement: string
}

interface AIAnalysisPanelProps {
    symbol: string
    checklist: ChecklistResult
    onChange?: (verdict: string, bias: string, confidence: number) => void
}

const VERDICT_STYLES = {
    AUTHORIZED: {
        badge: 'border-profit/40 bg-profit/10 text-profit',
        glow: 'shadow-[0_0_30px_rgba(99,230,190,0.15)]',
        label: 'AUTHORIZED',
    },
    STANDBY: {
        badge: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
        glow: 'shadow-[0_0_30px_rgba(234,179,8,0.1)]',
        label: 'STANDBY',
    },
    INVALID: {
        badge: 'border-loss/40 bg-loss/10 text-loss',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.12)]',
        label: 'INVALID',
    },
}

function BiasIcon({ bias }: { bias: string }) {
    if (bias === 'LONG') return <TrendingUp className="h-5 w-5 text-profit" />
    if (bias === 'SHORT') return <TrendingDown className="h-5 w-5 text-loss" />
    return <Minus className="h-5 w-5 text-muted-foreground" />
}

function ConfidenceBar({ value }: { value: number }) {
    const color = value >= 75 ? 'bg-profit' : value >= 55 ? 'bg-yellow-500' : 'bg-loss'
    return (
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${value}%` }} />
        </div>
    )
}

export function AIAnalysisPanel({ symbol, checklist, onChange }: AIAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevScoreRef = useRef<number>(-1)

    const fetchAnalysis = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/ai-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, checklist }),
            })
            const data = await res.json()
            if (!res.ok || !data.success || !data.analysis) {
                throw new Error(data?.error || 'Provider-backed AI analysis is unavailable.')
            }

            setAnalysis(data.analysis)
            onChange?.(data.analysis.verdict, data.analysis.bias, data.analysis.confidence)
        } catch {
            setAnalysis(null)
            setError('Failed to fetch provider-backed AI analysis.')
        } finally {
            setLoading(false)
        }
    }, [symbol, checklist, onChange])

    // Auto-fetch when checklist score changes meaningfully (debounced)
    useEffect(() => {
        const score = checklist.score
        if (Math.abs(score - prevScoreRef.current) < 5) return
        prevScoreRef.current = score

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(fetchAnalysis, 1200)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [checklist.score, fetchAnalysis])

    const verdictStyle = analysis ? VERDICT_STYLES[analysis.verdict] : VERDICT_STYLES.STANDBY

    return (
        <Card className={cn('glass-panel interactive-panel h-full', analysis ? verdictStyle.glow : '')}>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">AI Analysis</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{symbol}</Badge>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={fetchAnalysis}
                            disabled={loading}
                            className="h-8 w-8 border-white/10 bg-white/5"
                        >
                            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Loading skeleton */}
                {loading && !analysis && (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-16 rounded-xl bg-white/5" />
                        <div className="h-10 rounded-xl bg-white/5" />
                        <div className="h-20 rounded-xl bg-white/5" />
                    </div>
                )}

                {/* No analysis yet */}
                {!loading && !analysis && !error && (
                    <div className="py-6 text-center">
                        <BrainCircuit className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            Adjust your checklist to trigger AI analysis
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 border-white/10 bg-white/5"
                            onClick={fetchAnalysis}
                            disabled={loading}
                        >
                            Analyze Now
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/8 p-3 text-xs text-yellow-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {analysis && (
                    <>
                        {/* Verdict + bias row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className={cn('flex flex-col items-center justify-center rounded-xl border p-3', verdictStyle.badge)}>
                                <ShieldAlert className="mb-1 h-4 w-4" />
                                <span className="text-xs font-bold tracking-wide">{analysis.verdict}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3">
                                <BiasIcon bias={analysis.bias} />
                                <span className="mt-1 text-xs font-medium">{analysis.bias}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3">
                                <span className="text-xl font-bold">{analysis.confidence}%</span>
                                <span className="text-xs text-muted-foreground">Confidence</span>
                            </div>
                        </div>

                        {/* Confidence bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Signal Strength</span>
                                <span>{analysis.confidence}%</span>
                            </div>
                            <ConfidenceBar value={analysis.confidence} />
                        </div>

                        {/* AI Summary */}
                        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                            <p className="mb-1 text-xs font-medium text-primary">Market Read</p>
                            <p className="text-sm leading-6 text-muted-foreground">{analysis.summary}</p>
                        </div>

                        {/* Key levels */}
                        {analysis.key_levels?.length > 0 && (
                            <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <Target className="h-3.5 w-3.5 text-primary" />
                                    <p className="text-xs font-medium">Key Levels</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.key_levels.map((level, i) => (
                                        <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                                            {level}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Risk note */}
                        <div className="flex items-start gap-2 rounded-xl border border-loss/20 bg-loss/8 p-3">
                            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-loss" />
                            <p className="text-xs leading-5 text-muted-foreground">{analysis.risk_note}</p>
                        </div>

                        {/* Improvement tip */}
                        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/8 p-3">
                            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <p className="text-xs leading-5 text-muted-foreground">{analysis.improvement}</p>
                        </div>

                        <p className="text-center text-xs text-muted-foreground/60">
                            Provider-backed analysis · Not financial advice
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
