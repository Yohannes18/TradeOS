'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Calculator, DollarSign, Gauge, ShieldAlert, Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function RiskCalculator({
  accountBalance = 10000,
  riskPercent = 1,
  onTradeSubmit
}: RiskCalculatorProps) {
  const [pair, setPair] = useState('XAUUSD')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')

  const calculations = useMemo(() => {
    const entryPrice = parseFloat(entry) || 0
    const slPrice = parseFloat(sl) || 0
    const tpPrice = parseFloat(tp) || 0

    if (!entryPrice || !slPrice) {
      return null
    }

    const riskAmount = accountBalance * (riskPercent / 100)
    const slDistance = Math.abs(entryPrice - slPrice)
    const tpDistance = tpPrice ? Math.abs(tpPrice - entryPrice) : 0

    const positionSize = slDistance > 0 ? riskAmount / slDistance : 0
    const potentialProfit = tpDistance > 0 ? tpDistance * positionSize : 0
    const riskReward = slDistance > 0 && tpDistance > 0 ? tpDistance / slDistance : 0

    return {
      pair,
      entry: entryPrice,
      sl: slPrice,
      tp: tpPrice,
      positionSize: Math.round(positionSize * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      riskReward: Math.round(riskReward * 100) / 100,
      slDistance: Math.round(slDistance * 1000) / 1000,
      tpDistance: Math.round(tpDistance * 1000) / 1000,
    }
  }, [entry, sl, tp, accountBalance, riskPercent, pair])

  const handleSubmit = () => {
    if (calculations && onTradeSubmit) {
      onTradeSubmit(calculations)
    }
  }

  const isLong = calculations && calculations.entry > calculations.sl
  const isValidRR = calculations && calculations.riskReward >= 2

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Position Size Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <Field>
            <FieldLabel htmlFor="pair" className="text-xs">Symbol</FieldLabel>
            <Input
              id="pair"
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
              className="h-9 bg-secondary border-border text-sm"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="entry" className="text-xs">Entry Price</FieldLabel>
            <Input
              id="entry"
              type="number"
              step="any"
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
              step="any"
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
              step="any"
              placeholder="0.00"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              className="h-9 bg-secondary border-border text-sm text-profit"
            />
          </Field>

          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={!calculations || !isValidRR}
              className="h-9 w-full"
            >
              Log Trade
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Risk Amount
            </p>
            <p className="text-xl font-semibold text-loss">${calculations?.riskAmount || 0}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Lot Size
            </p>
            <p className="text-xl font-semibold text-foreground">{calculations?.positionSize || 0}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Risk/Reward
            </p>
            <p className={cn('text-xl font-semibold', isValidRR ? 'text-profit' : 'text-muted-foreground')}>
              1:{calculations?.riskReward || 0}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Potential Profit
            </p>
            <p className="text-xl font-semibold text-profit">${calculations?.potentialProfit || 0}</p>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              Risk % Visual
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-loss"
                style={{ width: `${Math.min(100, Math.max(0, riskPercent * 10))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{riskPercent}% of balance</p>
          </div>
        </div>

        {calculations && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <p className="text-foreground font-medium mb-1">Trade Preview</p>
            <p className="text-muted-foreground">
              {isLong ? 'Long' : 'Short'} {calculations.pair} | SL Distance: {calculations.slDistance} | TP Distance: {calculations.tpDistance}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
