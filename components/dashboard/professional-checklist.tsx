'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    DEFAULT_TRADE_SETUP_FORM,
    evaluateTradeSetup,
    getQuarterFromDate,
    getQuarterProfile,
} from '@/lib/trading/checklist'
import type { ChecklistResult, HistoricalMatch, PatternConfirmation, TradeSetupForm } from '@/lib/trading/types'
import { cn } from '@/lib/utils'
import { BrainCircuit, Info, Layers3, ShieldCheck, Target, TrendingUp } from 'lucide-react'

interface HistoricalTradeInput {
    id: string
    pair: string
    result?: string | null
    setup_grade?: string | null
    trade_date?: string | null
    created_at?: string | null
    notes?: string | null
    checklist_json?: Partial<ChecklistResult> | null
}

interface ProfessionalChecklistProps {
    riskReward?: number
    historicalTrades?: HistoricalTradeInput[]
    onChange?: (payload: { form: TradeSetupForm; result: ChecklistResult }) => void
}

const YES_NO = ['Yes', 'No'] as const
const TREND_OPTIONS = ['Uptrend', 'Downtrend'] as const
const DXY_OPTIONS = ['Bullish', 'Bearish', 'Neutral'] as const
const CRT_OPTIONS = ['Daily', '4H', '1H'] as const
const PATTERN_OPTIONS: PatternConfirmation[] = [
    'None',
    'Head & Shoulders',
    'Inverse Head & Shoulders',
    'Engulfing',
    'Pin Bar',
]

const SECTION_STYLE =
    'rounded-2xl border border-white/8 bg-white/4 p-4 shadow-[0_16px_44px_rgba(4,10,28,0.22)]'

const PATTERN_VISUALS: Record<PatternConfirmation, { title: string; visual: string; note: string }> = {
    None: { title: 'No pattern selected', visual: '......', note: 'Use only when structure confirmation is not pattern-based.' },
    'Head & Shoulders': { title: 'Head & Shoulders', visual: '_/\\__/\\\\__/_', note: 'Reversal structure with a failed high between two weaker shoulders.' },
    'Inverse Head & Shoulders': { title: 'Inverse Head & Shoulders', visual: '\\_/__\\/__\\_', note: 'Bullish reversal structure after a sell-side exhaustion move.' },
    Engulfing: { title: 'Engulfing', visual: '[ ][████]', note: 'Second candle fully takes prior candle range and shows displacement.' },
    'Pin Bar': { title: 'Pin Bar', visual: '--|█', note: 'Long rejection wick showing failed auction at the level.' },
}

function InfoTip({ text }: { text: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground transition hover:text-foreground" aria-label="More information">
                    <Info className="h-3.5 w-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 rounded-xl border border-white/10 bg-card/95 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {text}
            </TooltipContent>
        </Tooltip>
    )
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
    return (
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <span>{label}</span>
            <InfoTip text={hint} />
        </div>
    )
}

function SelectField({
    label,
    hint,
    value,
    options,
    onValueChange,
}: {
    label: string
    hint: string
    value: string
    options: readonly string[]
    onValueChange: (value: string) => void
}) {
    return (
        <div>
            <FieldLabel label={label} hint={hint} />
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-secondary/80">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-card/95">
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

function CheckboxField({
    checked,
    onCheckedChange,
    title,
    description,
}: {
    checked: boolean
    onCheckedChange: (value: boolean) => void
    title: string
    description: string
}) {
    return (
        <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-3 text-sm">
            <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} className="mt-0.5" />
            <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
        </label>
    )
}

function SummaryPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'profit' | 'loss' | 'neutral' }) {
    return (
        <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-sm font-semibold', tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-foreground')}>
                {value}
            </p>
        </div>
    )
}

function HistoricalMatchCard({ match }: { match: HistoricalMatch }) {
    return (
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{match.pair}</p>
                <Badge variant="outline" className="border-white/10 bg-white/5">
                    {match.similarity}% match
                </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{match.marketCondition}</p>
            <p className="mt-2 text-xs text-muted-foreground">
                Outcome: <span className="text-foreground">{match.outcome}</span>
                {' · '}Grade: <span className="text-foreground">{match.setupGrade}</span>
            </p>
            {match.tradeDate ? <p className="mt-1 text-xs text-muted-foreground">Trade: {new Date(match.tradeDate).toLocaleDateString()}</p> : null}
            {match.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{match.notes}</p> : null}
        </div>
    )
}

export function ProfessionalChecklist({ riskReward, historicalTrades = [], onChange }: ProfessionalChecklistProps) {
    const [form, setForm] = useState<TradeSetupForm>(DEFAULT_TRADE_SETUP_FORM)
    const [strictMode, setStrictMode] = useState(true)

    const quarter = useMemo(() => getQuarterFromDate(new Date()), [])
    const quarterProfile = useMemo(() => getQuarterProfile(quarter), [quarter])
    const result = useMemo(
        () => evaluateTradeSetup({ form, quarter, riskReward, historicalTrades }),
        [form, quarter, riskReward, historicalTrades],
    )

    useEffect(() => {
        onChange?.({ form, result })
    }, [form, result, onChange])

    const patternExample = PATTERN_VISUALS[form.bonusConfluence.pattern]

    return (
        <div className="space-y-4">
            <Card className="glass-panel overflow-hidden">
                <CardHeader className="border-b border-white/8 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Pre-Trade Execution Workspace
                            </div>
                            <CardTitle className="mt-2 text-xl">Decision-enforcing pre-trade engine</CardTitle>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                This workspace enforces quarter behavior, structure alignment, liquidity logic, trader state, and execution quality before a trade can be authorized.
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <SummaryPill label="Quarter" value={`${quarter} · ${quarterProfile.focus}`} tone="profit" />
                            <SummaryPill
                                label="RR Engine"
                                value={result.rrEvaluation?.label || 'Waiting for execution input'}
                                tone={result.rrEvaluation?.shouldAvoidTrade ? 'loss' : 'profit'}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section A</p>
                                <h3 className="mt-2 text-lg font-semibold">HTF / LTF Bias</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SelectField label="Weekly" hint="Higher timeframe trend must define the dominant directional map." value={form.htfBias.weekly} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, htfBias: { ...prev.htfBias, weekly: value as TradeSetupForm['htfBias']['weekly'] } }))} />
                                <SelectField label="Daily" hint="Daily structure should support the weekly path, not fight it." value={form.htfBias.daily} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, htfBias: { ...prev.htfBias, daily: value as TradeSetupForm['htfBias']['daily'] } }))} />
                                <SelectField label="4H" hint="4H confirms whether the higher timeframe move is still intact." value={form.htfBias.h4} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, htfBias: { ...prev.htfBias, h4: value as TradeSetupForm['htfBias']['h4'] } }))} />
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-4">
                                <SelectField label="1H" hint="1H is the first execution bridge into your HTF view." value={form.ltfBias.h1} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, ltfBias: { ...prev.ltfBias, h1: value as TradeSetupForm['ltfBias']['h1'] } }))} />
                                <SelectField label="30m" hint="30m should confirm timing and internal structure." value={form.ltfBias.m30} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, ltfBias: { ...prev.ltfBias, m30: value as TradeSetupForm['ltfBias']['m30'] } }))} />
                                <SelectField label="15m" hint="15m gives execution shape and short-term structure." value={form.ltfBias.m15} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, ltfBias: { ...prev.ltfBias, m15: value as TradeSetupForm['ltfBias']['m15'] } }))} />
                                <SelectField label="5m" hint="5m confirms the final trigger direction." value={form.ltfBias.m5} options={TREND_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, ltfBias: { ...prev.ltfBias, m5: value as TradeSetupForm['ltfBias']['m5'] } }))} />
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <SummaryPill label="HTF Agreement" value={`${result.htfAgreement || 0}%`} tone={(result.htfAgreement || 0) >= 67 ? 'profit' : 'loss'} />
                                <SummaryPill label="LTF Agreement" value={`${result.ltfAgreement || 0}%`} tone={(result.ltfAgreement || 0) >= 75 ? 'profit' : 'loss'} />
                                <SummaryPill label="Direction Bias" value={result.directionBias || 'Neutral'} tone={result.directionBias === 'Neutral' ? 'loss' : 'profit'} />
                            </div>
                        </section>

                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section B</p>
                                <h3 className="mt-2 text-lg font-semibold">Structure & Levels</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <SelectField label="Key S/R respected by HTF and LTF?" hint="If both timeframes are not respecting the same level, the setup is structurally weaker." value={form.supportResistanceAligned} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, supportResistanceAligned: value as TradeSetupForm['supportResistanceAligned'] }))} />
                                <SelectField label="HTF S&D present? (D / 4H)" hint="Higher timeframe zones anchor the decision. No HTF zone means lower institutional relevance." value={form.supplyDemand.htfPresent} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, supplyDemand: { ...prev.supplyDemand, htfPresent: value as TradeSetupForm['supplyDemand']['htfPresent'] } }))} />
                                <SelectField label="LTF S&D present? (1H / 30m / 15m / 5m)" hint="Lower timeframe zones refine the entry into the higher timeframe map." value={form.supplyDemand.ltfPresent} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, supplyDemand: { ...prev.supplyDemand, ltfPresent: value as TradeSetupForm['supplyDemand']['ltfPresent'] } }))} />
                                <SelectField label="LTF correction into HTF zone?" hint="The best setups revisit HTF areas with orderly LTF correction." value={form.supplyDemand.ltfCorrectionIntoHtfZone} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, supplyDemand: { ...prev.supplyDemand, ltfCorrectionIntoHtfZone: value as TradeSetupForm['supplyDemand']['ltfCorrectionIntoHtfZone'] } }))} />
                                <SelectField label="Confluence strong?" hint="Use this to confirm whether the full zone stack is strong enough to matter." value={form.supplyDemand.confluenceStrong} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, supplyDemand: { ...prev.supplyDemand, confluenceStrong: value as TradeSetupForm['supplyDemand']['confluenceStrong'] } }))} />
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <SummaryPill label="Alignment" value={result.supplyDemand?.alignment || 'Weak'} tone={result.supplyDemand?.alignment === 'Strong' ? 'profit' : result.supplyDemand?.alignment === 'Moderate' ? 'neutral' : 'loss'} />
                                <SummaryPill label="Direction Bias" value={result.supplyDemand?.directionBias || 'Neutral'} tone={result.supplyDemand?.directionBias === 'Neutral' ? 'loss' : 'profit'} />
                                <SummaryPill label="Grade Contribution" value={`${result.supplyDemand?.score || 0}`} tone={(result.supplyDemand?.score || 0) >= 80 ? 'profit' : 'loss'} />
                            </div>
                        </section>

                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section C</p>
                                <h3 className="mt-2 text-lg font-semibold">Liquidity Engine</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SelectField label="Liquidity sweep on LTF?" hint="Sweeps reveal whether price has cleaned out weak liquidity before moving." value={form.liquidity.sweepOnLtf} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, liquidity: { ...prev.liquidity, sweepOnLtf: value as TradeSetupForm['liquidity']['sweepOnLtf'] } }))} />
                                <SelectField label="Liquidity near SL?" hint="Nearby opposing liquidity weakens your stop placement and often signals poor protection." value={form.liquidity.liquidityNearSl} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, liquidity: { ...prev.liquidity, liquidityNearSl: value as TradeSetupForm['liquidity']['liquidityNearSl'] } }))} />
                                <SelectField label="Liquidity type" hint="Classify the liquidity profile so the engine can interpret the sweep correctly." value={form.liquidity.type} options={['Equal Highs', 'Equal Lows', 'Engineered Liquidity']} onValueChange={(value) => setForm((prev) => ({ ...prev, liquidity: { ...prev.liquidity, type: value as TradeSetupForm['liquidity']['type'] } }))} />
                            </div>
                        </section>

                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section D</p>
                                <h3 className="mt-2 text-lg font-semibold">Bonus Confluence</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SelectField label="Did CRT occur?" hint="Use CRT only when the confirmation genuinely formed, not because the trade needs help." value={form.bonusConfluence.crtOccurred} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, bonusConfluence: { ...prev.bonusConfluence, crtOccurred: value as TradeSetupForm['bonusConfluence']['crtOccurred'] } }))} />
                                <SelectField label="CRT timeframe" hint="Use the timeframe where CRT actually printed." value={form.bonusConfluence.crtTimeframe} options={CRT_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, bonusConfluence: { ...prev.bonusConfluence, crtTimeframe: value as TradeSetupForm['bonusConfluence']['crtTimeframe'] } }))} />
                                <SelectField label="Pattern confirmation" hint="Patterns are optional, but if selected they should visibly confirm the idea." value={form.bonusConfluence.pattern} options={PATTERN_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, bonusConfluence: { ...prev.bonusConfluence, pattern: value as TradeSetupForm['bonusConfluence']['pattern'] } }))} />
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                                    <Layers3 className="h-3.5 w-3.5" />
                                    Pattern Visual
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                                    <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-5 text-center font-mono text-lg tracking-[0.18em] text-foreground">
                                        {patternExample.visual}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{patternExample.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{patternExample.note}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section E</p>
                                <h3 className="mt-2 text-lg font-semibold">Trader Intent & Psychology</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SelectField label="Trade direction thought" hint="The system needs to know whether you are working with trend or fading it." value={form.traderIntent.directionThought} options={['With Trend', 'Counter Trend']} onValueChange={(value) => setForm((prev) => ({ ...prev, traderIntent: { ...prev.traderIntent, directionThought: value as TradeSetupForm['traderIntent']['directionThought'] } }))} />
                                <SelectField label="Psychology state" hint="A distracted state invalidates discretionary execution quality." value={form.traderIntent.psychology} options={['Focused', 'Neutral', 'Distracted']} onValueChange={(value) => setForm((prev) => ({ ...prev, traderIntent: { ...prev.traderIntent, psychology: value as TradeSetupForm['traderIntent']['psychology'] } }))} />
                                <SelectField label="Environment" hint="A distracting environment leaks execution discipline and increases errors." value={form.traderIntent.environment} options={['Clean / Quiet', 'Distracting']} onValueChange={(value) => setForm((prev) => ({ ...prev, traderIntent: { ...prev.traderIntent, environment: value as TradeSetupForm['traderIntent']['environment'] } }))} />
                            </div>
                        </section>

                        <section className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section F-H</p>
                                <h3 className="mt-2 text-lg font-semibold">Execution, Quarter Engine, and DXY</h3>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <SelectField label="TP set?" hint="Take profit must be defined before the system can approve the trade." value={form.execution.tpSet} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, execution: { ...prev.execution, tpSet: value as TradeSetupForm['execution']['tpSet'] } }))} />
                                <SelectField label="SL set?" hint="Stop loss must be defined before execution is valid." value={form.execution.slSet} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, execution: { ...prev.execution, slSet: value as TradeSetupForm['execution']['slSet'] } }))} />
                                <SelectField label="DXY trend" hint="DXY helps confirm or conflict with USD-sensitive instruments and broader risk conditions." value={form.dxy.trend} options={DXY_OPTIONS} onValueChange={(value) => setForm((prev) => ({ ...prev, dxy: { ...prev.dxy, trend: value as TradeSetupForm['dxy']['trend'] } }))} />
                                <SelectField label="DXY confirmation aligned?" hint="Use this to confirm whether DXY is helping your intended trade direction." value={form.dxy.aligned} options={YES_NO} onValueChange={(value) => setForm((prev) => ({ ...prev, dxy: { ...prev.dxy, aligned: value as TradeSetupForm['dxy']['aligned'] } }))} />
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                                    <BrainCircuit className="h-3.5 w-3.5" />
                                    Quarter Engine
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <SummaryPill label="Market Behavior" value={quarterProfile.marketBehavior} />
                                    <SummaryPill label="Recommended Strategy" value={quarterProfile.recommendedStrategy} tone="profit" />
                                    <SummaryPill label="Execution Notes" value={quarterProfile.executionNotes.join(' ')} />
                                </div>
                            </div>
                        </section>
                    </div>

                    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className={SECTION_STYLE}>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Section I-J</p>
                                    <h3 className="mt-2 text-lg font-semibold">RR Engine & Setup Grading</h3>
                                </div>
                                <Badge className={cn(
                                    'rounded-full px-3 py-1 text-xs',
                                    result.status === 'AUTHORIZED'
                                        ? 'bg-profit/15 text-profit'
                                        : result.status === 'INVALID'
                                            ? 'bg-loss/15 text-loss'
                                            : 'bg-yellow-500/15 text-yellow-400'
                                )}>
                                    {result.status}
                                </Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-4">
                                <SummaryPill label="Quarter" value={result.quarter} tone="profit" />
                                <SummaryPill label="Grade" value={result.grade} tone={result.grade === 'F' ? 'loss' : 'profit'} />
                                <SummaryPill label="Checklist Score" value={`${result.score}%`} tone={result.score >= 76 ? 'profit' : result.score < 60 ? 'loss' : 'neutral'} />
                                <SummaryPill label="RR" value={typeof riskReward === 'number' && Number.isFinite(riskReward) ? `${riskReward.toFixed(2)}R` : 'Waiting'} tone={result.rrEvaluation?.shouldAvoidTrade ? 'loss' : 'profit'} />
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
                                <p className="text-sm font-medium text-foreground">{result.reason}</p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.rrEvaluation?.message}</p>
                                {result.rrEvaluation?.moveStopToBreakevenAtOneToOne ? (
                                    <p className="mt-2 text-sm leading-6 text-primary">Advice: move SL to breakeven at 1:1.</p>
                                ) : null}
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <SummaryPill label="Context Gate" value={result.context_valid ? 'PASS' : 'FAIL'} tone={result.context_valid ? 'profit' : 'loss'} />
                                <SummaryPill label="Phase Gate" value={result.phase_valid ? 'PASS' : 'FAIL'} tone={result.phase_valid ? 'profit' : 'loss'} />
                                <SummaryPill label="Target Gate" value={result.target_valid ? 'PASS' : 'FAIL'} tone={result.target_valid ? 'profit' : 'loss'} />
                            </div>
                        </div>

                        <div className={SECTION_STYLE}>
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">Section K</p>
                                <h3 className="mt-2 text-lg font-semibold">Historical Match System</h3>
                            </div>
                            <div className="space-y-3">
                                {result.historicalMatches && result.historicalMatches.length > 0 ? (
                                    result.historicalMatches.map((match) => <HistoricalMatchCard key={match.id} match={match} />)
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-muted-foreground">
                                        No similar journal trades were found yet. Once more structured trades are logged, matching will display past condition and outcome here.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className={SECTION_STYLE}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-primary">System Output</p>
                                <h3 className="mt-2 text-lg font-semibold">Structured execution output</h3>
                            </div>
                            <CheckboxField
                                checked={strictMode}
                                onCheckedChange={setStrictMode}
                                title="Strict enforcement mode"
                                description="When enabled, gate failures should block execution instead of being treated as warnings."
                            />
                        </div>
                        <div className="grid gap-4 xl:grid-cols-3">
                            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Execution Notes
                                </div>
                                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                                    {(result.executionSummary || []).map((note) => (
                                        <p key={note}>{note}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                                    <Target className="h-3.5 w-3.5" />
                                    Enforcement Notes
                                </div>
                                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                                    {(result.enforcementNotes || []).slice(0, strictMode ? 6 : 4).map((note) => (
                                        <p key={note}>{note}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Decision
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{result.grade}</p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {strictMode && result.status !== 'AUTHORIZED'
                                        ? 'Execution should remain blocked until the failed gates improve.'
                                        : 'Continue to execution only if all required risk and macro inputs remain aligned.'}
                                </p>
                            </div>
                        </div>
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}
