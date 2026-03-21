'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle, RotateCcw, ShieldCheck, Workflow, Crosshair } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { SessionValue } from '@/lib/session'
import { SESSION_LABELS, SESSION_VALUES } from '@/lib/session'

type TrendInput = 'bullish' | 'bearish' | 'none'
type RegimeInput = 'trend' | 'range' | 'volatile'
type SessionInput = SessionValue

type ChecklistInput = {
  trend: TrendInput
  regime: RegimeInput
  fundamentalAligned: boolean
  session: SessionInput
  highImpactNewsNearby: boolean

  strongZone: boolean
  cleanImpulse: boolean
  freshZone: boolean
  liquidity: boolean
  confluence: boolean
  zone_quality: 1 | 2 | 3

  ltfBreak: boolean
  entryRefinement: boolean
  rr: number
  slLogical: boolean
  timingCorrect: boolean
}

const DEFAULT_INPUT: ChecklistInput = {
  trend: 'none',
  regime: 'range',
  fundamentalAligned: false,
  session: 'london',
  highImpactNewsNearby: false,

  strongZone: false,
  cleanImpulse: false,
  freshZone: false,
  liquidity: false,
  confluence: false,
  zone_quality: 2,

  ltfBreak: false,
  entryRefinement: false,
  rr: 1,
  slLogical: false,
  timingCorrect: false,
}

const weights = {
  context: 0.3,
  setup: 0.4,
  execution: 0.3,
}

interface ChecklistPanelProps {
  userId: string
  onScoreChange?: (score: number) => void
  onDecisionChange?: (decision: 'VALID' | 'RISKY' | 'NO TRADE') => void
  onContextChange?: (context: { session: SessionInput; regime: RegimeInput; rr: number }) => void
  onLogSaved?: (logId: string | null) => void
}

export function ChecklistPanel({ userId, onScoreChange, onDecisionChange, onContextChange, onLogSaved }: ChecklistPanelProps) {
  const [input, setInput] = useState<ChecklistInput>(DEFAULT_INPUT)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const contextRawScore =
    (input.trend !== 'none' ? 1 : 0) +
    (input.regime ? 1 : 0) +
    (input.fundamentalAligned ? 1 : 0) +
    (input.session ? 1 : 0) +
    (input.highImpactNewsNearby ? 0 : 1)
  const setupRawScore =
    (input.strongZone ? 1 : 0) +
    (input.cleanImpulse ? 1 : 0) +
    (input.freshZone ? 1 : 0) +
    (input.liquidity ? 1 : 0) +
    (input.confluence ? 1 : 0) +
    input.zone_quality / 3
  const executionRawScore =
    (input.ltfBreak ? 1 : 0) +
    (input.entryRefinement ? 1 : 0) +
    (input.rr >= 2 ? 1 : 0) +
    (input.slLogical ? 1 : 0) +
    (input.timingCorrect ? 1 : 0)

  const contextScore = contextRawScore / 5
  const setupScore = setupRawScore / 6
  const executionScore = executionRawScore / 5

  const trendContextWeight = input.regime === 'range' ? 0.8 : 1
  const contextAdjusted = contextScore * trendContextWeight

  let weightedScore =
    contextAdjusted * weights.context +
    setupScore * weights.setup +
    executionScore * weights.execution

  if (input.highImpactNewsNearby) {
    weightedScore -= 0.1
  }

  const criticalFail = input.trend === 'none' || input.rr < 2
  if (criticalFail) {
    weightedScore = 0
  }

  weightedScore = Math.max(0, Math.min(1, weightedScore))
  const totalScore = Math.round(weightedScore * 10)

  const grade =
    weightedScore >= 0.8 ? 'A+ Setup' :
      weightedScore >= 0.6 ? 'B Setup' :
        weightedScore >= 0.4 ? 'C Setup' :
          'No Trade'

  const decision: 'VALID' | 'RISKY' | 'NO TRADE' =
    criticalFail || weightedScore < 0.4
      ? 'NO TRADE'
      : weightedScore >= 0.6
        ? 'VALID'
        : 'RISKY'

  const warnings = [
    input.highImpactNewsNearby ? 'High-impact news nearby.' : null,
    !input.fundamentalAligned ? 'Fundamental bias not aligned.' : null,
    input.regime === 'volatile' ? 'Volatile regime: reduce size and RR expectations.' : null,
    input.regime === 'range' ? 'Range regime: trend signals carry lower reliability.' : null,
  ].filter((item): item is string => Boolean(item))

  const updateInput = (patch: Partial<ChecklistInput>) => {
    const nextInput = { ...input, ...patch }
    setInput(nextInput)

    const nextContextRaw =
      (nextInput.trend !== 'none' ? 1 : 0) +
      (nextInput.regime ? 1 : 0) +
      (nextInput.fundamentalAligned ? 1 : 0) +
      (nextInput.session ? 1 : 0) +
      (nextInput.highImpactNewsNearby ? 0 : 1)
    const nextSetupRaw =
      (nextInput.strongZone ? 1 : 0) +
      (nextInput.cleanImpulse ? 1 : 0) +
      (nextInput.freshZone ? 1 : 0) +
      (nextInput.liquidity ? 1 : 0) +
      (nextInput.confluence ? 1 : 0) +
      nextInput.zone_quality / 3
    const nextExecutionRaw =
      (nextInput.ltfBreak ? 1 : 0) +
      (nextInput.entryRefinement ? 1 : 0) +
      (nextInput.rr >= 2 ? 1 : 0) +
      (nextInput.slLogical ? 1 : 0) +
      (nextInput.timingCorrect ? 1 : 0)

    const nextContext = nextContextRaw / 5
    const nextSetup = nextSetupRaw / 6
    const nextExecution = nextExecutionRaw / 5
    const nextTrendWeight = nextInput.regime === 'range' ? 0.8 : 1
    let nextWeighted = nextContext * nextTrendWeight * weights.context + nextSetup * weights.setup + nextExecution * weights.execution

    if (nextInput.highImpactNewsNearby) {
      nextWeighted -= 0.1
    }

    if (nextInput.trend === 'none' || nextInput.rr < 2) {
      nextWeighted = 0
    }

    nextWeighted = Math.max(0, Math.min(1, nextWeighted))
    const nextScore = Math.round(nextWeighted * 10)

    const nextDecision: 'VALID' | 'RISKY' | 'NO TRADE' =
      nextWeighted < 0.4 ? 'NO TRADE' : nextWeighted >= 0.6 ? 'VALID' : 'RISKY'

    onScoreChange?.(nextScore)
    onDecisionChange?.(nextDecision)
    onContextChange?.({ session: nextInput.session, regime: nextInput.regime, rr: nextInput.rr })
  }

  const handleReset = () => {
    setInput(DEFAULT_INPUT)
    onScoreChange?.(0)
    onDecisionChange?.('NO TRADE')
    onContextChange?.({ session: DEFAULT_INPUT.session, regime: DEFAULT_INPUT.regime, rr: DEFAULT_INPUT.rr })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { data, error } = await supabase.from('checklist_logs').insert({
      user_id: userId,
      trend: input.trend !== 'none',
      zone: input.strongZone,
      liquidity: input.liquidity,
      structure: input.ltfBreak,
      rr: input.rr >= 2,
      context_score: Math.round(contextAdjusted * 100) / 100,
      setup_score: Math.round(setupScore * 100) / 100,
      execution_score: Math.round(executionScore * 100) / 100,
      total_score: totalScore,
      data: {
        trend: input.trend,
        regime: input.regime,
        fundamentalAligned: input.fundamentalAligned,
        session: input.session,
        highImpactNewsNearby: input.highImpactNewsNearby,
        strongZone: input.strongZone,
        cleanImpulse: input.cleanImpulse,
        freshZone: input.freshZone,
        liquidity: input.liquidity,
        confluence: input.confluence,
        zone_quality: input.zone_quality,
        ltfBreak: input.ltfBreak,
        entryRefinement: input.entryRefinement,
        rr: input.rr,
        slLogical: input.slLogical,
        timingCorrect: input.timingCorrect,
      },
    }).select('id').single()

    if (error) {
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    onLogSaved?.(data?.id ?? null)
    handleReset()
  }

  const getScoreColor = () => {
    const percentage = weightedScore * 100
    if (percentage >= 80) return 'text-profit'
    if (percentage >= 60) return 'text-chart-4'
    if (percentage >= 40) return 'text-muted-foreground'
    return 'text-loss'
  }

  const getScoreLabel = () => {
    return decision === 'VALID' ? 'VALID TRADE' : decision === 'RISKY' ? 'WATCHLIST' : 'NO TRADE'
  }

  return (
    <Card className="glass-panel interactive-panel h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Pre-Trade Checklist</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Score the setup with less friction and clearer visual feedback.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="touch-scroll flex-1 space-y-4 overflow-auto pr-1">
          <section className="interactive-panel space-y-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">A) Market Context (30%)</h3>
                <p className="text-xs text-muted-foreground">Align trend, session, and macro conditions before judging the setup.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-2 rounded-2xl border border-transparent p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">HTF Trend aligned</span>
                <Select value={input.trend} onValueChange={(v) => updateInput({ trend: v as TrendInput })}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/8 bg-white/4 sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="none">Not aligned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-transparent p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">Market regime</span>
                <Select value={input.regime} onValueChange={(v) => updateInput({ regime: v as RegimeInput })}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/8 bg-white/4 sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trend">Trending</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                    <SelectItem value="volatile">Volatile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-transparent p-2">
                <span className="text-xs text-muted-foreground">Fundamental bias aligned</span>
                <Switch checked={input.fundamentalAligned} onCheckedChange={(checked) => updateInput({ fundamentalAligned: checked })} />
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-transparent p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">Session</span>
                <Select value={input.session} onValueChange={(v) => updateInput({ session: v as SessionInput })}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/8 bg-white/4 sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_VALUES.map((session) => (
                      <SelectItem key={session} value={session}>{SESSION_LABELS[session]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-transparent p-2">
                <span className="text-xs text-muted-foreground">High-impact news nearby</span>
                <Switch checked={input.highImpactNewsNearby} onCheckedChange={(checked) => updateInput({ highImpactNewsNearby: checked })} />
              </div>
            </div>
          </section>

          <section className="interactive-panel space-y-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Workflow className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">B) Setup Quality (40%)</h3>
                <p className="text-xs text-muted-foreground">Measure structural quality, freshness, and institutional confluence.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'strongZone', label: 'Strong supply/demand zone' },
                { key: 'cleanImpulse', label: 'Clean institutional impulse' },
                { key: 'freshZone', label: 'Fresh zone (not retested)' },
                { key: 'liquidity', label: 'Liquidity sweep present' },
                { key: 'confluence', label: 'Confluence (Fibo/structure)' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-transparent p-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <Switch
                    checked={Boolean(input[item.key as keyof ChecklistInput])}
                    onCheckedChange={(checked) => updateInput({ [item.key]: checked } as Partial<ChecklistInput>)}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Zone quality (1-3)</span>
                  <span className="text-xs font-medium">{input.zone_quality}</span>
                </div>
                <Slider
                  min={1}
                  max={3}
                  step={1}
                  value={[input.zone_quality]}
                  onValueChange={(value) => updateInput({ zone_quality: value[0] as 1 | 2 | 3 })}
                />
              </div>
            </div>
          </section>

          <section className="interactive-panel space-y-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Crosshair className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">C) Execution Precision (30%)</h3>
                <p className="text-xs text-muted-foreground">Confirm the trigger, the timing, and whether the RR is worth the risk.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'ltfBreak', label: 'LTF structure break confirmed' },
                { key: 'entryRefinement', label: 'Entry refinement (OB/FVG)' },
                { key: 'slLogical', label: 'SL placement logical' },
                { key: 'timingCorrect', label: 'Timing correct (not chasing)' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-transparent p-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <Switch
                    checked={Boolean(input[item.key as keyof ChecklistInput])}
                    onCheckedChange={(checked) => updateInput({ [item.key]: checked } as Partial<ChecklistInput>)}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Risk/Reward (min 1:2)</span>
                  <span className="text-xs font-medium">1:{input.rr.toFixed(1)}</span>
                </div>
                <Slider
                  min={1}
                  max={4}
                  step={0.5}
                  value={[input.rr]}
                  onValueChange={(value) => updateInput({ rr: value[0] })}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-white/8 pt-4">
          <div className="mb-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Setup Grade</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-2xl font-bold', getScoreColor())}>{grade.replace(' Setup', '')}</span>
                  <span className="text-sm text-muted-foreground">({Math.round(weightedScore * 100)}%)</span>
                </div>
              </div>
              <div className={cn('flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium', {
                'bg-profit/10 text-profit': decision === 'VALID',
                'bg-chart-4/10 text-chart-4': decision === 'RISKY',
                'bg-loss/10 text-loss': decision === 'NO TRADE',
              })}>
                <CheckCircle className="h-3.5 w-3.5" />
                {getScoreLabel()}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div className="stat-tile rounded-xl px-3 py-2">
              <span className="text-muted-foreground">Context: </span>
              <span className="font-medium">{Math.round(contextAdjusted * 100)}%</span>
              </div>
              <div className="stat-tile rounded-xl px-3 py-2">
              <span className="text-muted-foreground">Setup: </span>
              <span className="font-medium">{Math.round(setupScore * 100)}%</span>
              </div>
              <div className="stat-tile rounded-xl px-3 py-2">
              <span className="text-muted-foreground">Execution: </span>
              <span className="font-medium">{Math.round(executionScore * 100)}%</span>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="mb-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="mb-1 text-xs font-medium text-foreground">Warnings</p>
                <ul className="space-y-1">
                  {warnings.map((warning) => (
                    <li key={warning} className="text-xs text-muted-foreground">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={totalScore === 0 || isSaving}
            className="pressable w-full"
          >
            Log Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
