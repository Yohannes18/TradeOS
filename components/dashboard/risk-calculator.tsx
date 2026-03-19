'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Calculator, DollarSign, Gauge, ShieldAlert, Target, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveInstrument, INSTRUMENT_LIST, type InstrumentConfig } from '@/lib/trading/instruments'

interface RiskCalculatorProps {
  accountBalance?: number
  riskPercent?: number
  onTradeSubmit?: (trade: TradeData) => void
}

interface TradeData {
  pair: string
  entry: number
  sl: number
  tp: number
  positionSize: number
  riskAmount: number
  potentialProfit: number
  riskReward: number
}

const RR_WARNING = 1.5
const RR_GOOD = 2.5

const INSTRUMENT_TYPE_LABEL: Record<InstrumentConfig['type'], string> = {
  forex: 'Forex',
  metal: 'Metal',
  index: 'Index',
  crypto: 'Crypto',
}

const roundToStep = (value: number, step: number) => {
  if (!step) return value
  return Math.round(value / step) * step
}

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const formatNumber = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(decimals)
}

export function RiskCalculator({
  accountBalance = 10000,
  riskPercent = 1,
  onTradeSubmit
}: RiskCalculatorProps) {
  const [pair, setPair] = useState('XAUUSD')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')

  const instrument = useMemo(() => resolveInstrument(pair), [pair])

  const calculations = useMemo(() => {
    const entryPrice = Number(entry) || 0
    const slPrice = Number(sl) || 0
    const tpPrice = Number(tp) || 0
    const hasEntry = Number.isFinite(entryPrice) && entryPrice > 0
    const hasSl = Number.isFinite(slPrice) && slPrice > 0
    const hasTp = Number.isFinite(tpPrice) && tpPrice > 0

    if (!hasEntry || !hasSl) {
      return null
    }

    const direction = entryPrice > slPrice ? 'LONG' : entryPrice < slPrice ? 'SHORT' : 'FLAT'
    const isLong = direction === 'LONG'
    const isShort = direction === 'SHORT'
    const riskAmount = accountBalance * (riskPercent / 100)
    const slDistance = Math.abs(entryPrice - slPrice)
    const tpDistance = hasTp ? Math.abs(tpPrice - entryPrice) : 0
    const pipDistance = slDistance / instrument.pip_size
    const tpPipDistance = tpDistance / instrument.pip_size
    const riskPerLot = pipDistance * instrument.pip_value_per_lot
    const rawPosition = riskPerLot > 0 ? riskAmount / riskPerLot : 0
    const steppedPosition = roundToStep(rawPosition, instrument.lot_step)
    const positionSize = clampValue(steppedPosition, instrument.min_lot, instrument.max_lot)
    const positionAdjusted = positionSize !== steppedPosition
    const potentialProfit = tpPipDistance > 0 ? tpPipDistance * instrument.pip_value_per_lot * positionSize : 0
    const riskReward = slDistance > 0 && tpDistance > 0 ? tpDistance / slDistance : 0
    const percentGain = accountBalance > 0 ? (potentialProfit / accountBalance) * 100 : 0
    const marginRequired = instrument.leverage > 0
      ? (positionSize * instrument.contract_size * entryPrice) / instrument.leverage
      : 0

    const errors: string[] = []
    const warnings: string[] = []

    if (slDistance === 0) {
      errors.push('Invalid SL placement')
    }

    if (direction === 'FLAT') {
      errors.push('Entry equals SL')
    }

    if (hasTp) {
      if ((isLong && tpPrice <= entryPrice) || (isShort && tpPrice >= entryPrice)) {
        errors.push('Invalid TP placement')
      }
    } else {
      warnings.push('TP not set')
    }

    if (riskReward > 0 && riskReward < RR_WARNING) {
      warnings.push('Low RR setup')
    }

    if (rawPosition < instrument.min_lot) {
      warnings.push('Position size below min lot')
    }

    if (rawPosition > instrument.max_lot) {
      warnings.push('Position size exceeds max lot')
    }

    if (positionAdjusted) {
      warnings.push('Position size rounded to broker step')
    }

    const quality = riskReward >= RR_GOOD ? 'High Quality' : riskReward >= RR_WARNING ? 'Acceptable' : 'Poor Setup'

    return {
      pair,
      direction,
      instrumentType: instrument.type,
      entry: entryPrice,
      sl: slPrice,
      tp: tpPrice,
      positionSize,
      riskAmount,
      potentialProfit,
      riskReward,
      slDistance,
      tpDistance,
      pipDistance,
      tpPipDistance,
      pipValue: instrument.pip_value_per_lot,
      percentGain,
      marginRequired,
      quality,
      errors,
      warnings,
    }
  }, [entry, sl, tp, accountBalance, riskPercent, pair, instrument])

  const handleSubmit = () => {
    if (calculations && onTradeSubmit) {
      if (calculations.errors.length > 0) return
      onTradeSubmit({
        pair: calculations.pair,
        entry: calculations.entry,
        sl: calculations.sl,
        tp: calculations.tp,
        positionSize: Math.round(calculations.positionSize * 100) / 100,
        riskAmount: Math.round(calculations.riskAmount * 100) / 100,
        potentialProfit: Math.round(calculations.potentialProfit * 100) / 100,
        riskReward: Math.round(calculations.riskReward * 100) / 100,
      })
    }
  }

  const isLong = calculations?.direction === 'LONG'
  const isShort = calculations?.direction === 'SHORT'
  const hasErrors = (calculations?.errors?.length || 0) > 0
  const pipLabel = instrument.type === 'forex' ? 'pips' : 'points'
  const riskReward = calculations?.riskReward || 0
  const rrBarWidth = Math.min(100, Math.max(0, (riskReward / 3) * 100))

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Professional Risk Engine
        </CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{INSTRUMENT_TYPE_LABEL[instrument.type]}</Badge>
          {calculations?.direction && (
            <Badge className={cn('text-xs gap-1', isLong ? 'bg-profit/10 text-profit border-profit/20' : 'bg-loss/10 text-loss border-loss/20')}>
              {isLong ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {calculations.direction}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">{instrument.symbol}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <Field>
            <FieldLabel htmlFor="pair" className="text-xs">Symbol</FieldLabel>
            <Input
              id="pair"
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
              className="h-9 bg-secondary border-border text-sm"
              list="instrument-list"
            />
            <datalist id="instrument-list">
              {INSTRUMENT_LIST.map((item) => (
                <option key={item.symbol} value={item.symbol} />
              ))}
            </datalist>
          </Field>
          <Field>
            <FieldLabel htmlFor="entry" className="text-xs">Entry Price</FieldLabel>
            <Input
              id="entry"
              type="number"
              step={instrument.pip_size}
              placeholder="0.00"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="h-9 bg-secondary border-border text-sm"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sl" className="text-xs">Stop Loss</FieldLabel>
            <Input
              id="sl"
              type="number"
              step={instrument.pip_size}
              placeholder="0.00"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="h-9 bg-secondary border-border text-sm text-loss"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tp" className="text-xs">Take Profit</FieldLabel>
            <Input
              id="tp"
              type="number"
              step={instrument.pip_size}
              placeholder="0.00"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              className="h-9 bg-secondary border-border text-sm text-profit"
            />
          </Field>

          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={!calculations || hasErrors}
              className="h-9 w-full"
            >
              Log Trade
            </Button>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Risk %</p>
              <p className="text-sm font-semibold text-foreground">{formatNumber(riskPercent, 2)}%</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Risk Amount
            </p>
            <p className="text-xl font-semibold text-loss">${formatNumber(calculations?.riskAmount || 0, 2)}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Position Size
            </p>
            <p className="text-xl font-semibold text-foreground">{formatNumber(calculations?.positionSize || 0, 2)}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {pipLabel.toUpperCase()} Distance
            </p>
            <p className="text-xl font-semibold text-foreground">
              {formatNumber(calculations?.pipDistance || 0, 1)}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Potential Profit
            </p>
            <p className="text-xl font-semibold text-profit">${formatNumber(calculations?.potentialProfit || 0, 2)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              Risk/Reward
            </p>
            <p className={cn('text-xl font-semibold', riskReward >= RR_WARNING ? 'text-profit' : 'text-chart-4')}>
              1:{formatNumber(riskReward, 2)}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-background overflow-hidden">
              <div className="h-full bg-profit" style={{ width: `${rrBarWidth}%` }} />
            </div>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Pip Value / Lot</p>
            <p className="text-xl font-semibold text-foreground">${formatNumber(calculations?.pipValue || 0, 2)}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground">% Gain if TP Hits</p>
            <p className="text-xl font-semibold text-profit">{formatNumber(calculations?.percentGain || 0, 2)}%</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Est. Margin Required</p>
            <p className="text-xl font-semibold text-foreground">${formatNumber(calculations?.marginRequired || 0, 2)}</p>
          </div>
        </div>

        {calculations && calculations.warnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-chart-4 mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Warnings
            </div>
            <ul className="space-y-1">
              {calculations.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {calculations && calculations.errors.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-loss/10 p-3 text-xs text-loss">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Fix Before Logging
            </div>
            <ul className="space-y-1">
              {calculations.errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {calculations && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <p className="text-foreground font-medium mb-1">Trade Preview</p>
            <p className="text-muted-foreground">
              {isLong ? 'Long' : isShort ? 'Short' : 'Flat'} {calculations.pair} | Risk: {formatNumber(calculations.pipDistance, 1)} {pipLabel} | Reward: {formatNumber(calculations.tpPipDistance, 1)} {pipLabel} | RR: 1:{formatNumber(calculations.riskReward, 2)}
            </p>
            <p className={cn('mt-1 text-xs font-medium', calculations.riskReward >= RR_GOOD ? 'text-profit' : calculations.riskReward >= RR_WARNING ? 'text-chart-4' : 'text-loss')}>
              Classification: {calculations.quality}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
