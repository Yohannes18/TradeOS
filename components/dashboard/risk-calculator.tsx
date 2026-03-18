'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Calculator, DollarSign, Target, ShieldAlert, TrendingUp } from 'lucide-react'
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
  const [pipValue, setPipValue] = useState('10')

  const calculations = useMemo(() => {
    const entryPrice = parseFloat(entry) || 0
    const slPrice = parseFloat(sl) || 0
    const tpPrice = parseFloat(tp) || 0
    const pipVal = parseFloat(pipValue) || 10

    if (!entryPrice || !slPrice) {
      return null
    }

    const riskAmount = accountBalance * (riskPercent / 100)
    const slDistance = Math.abs(entryPrice - slPrice)
    const tpDistance = tpPrice ? Math.abs(tpPrice - entryPrice) : 0
    
    // Calculate position size
    const pipsAtRisk = slDistance / 0.01 // Assuming standard pip calculation
    const positionSize = pipsAtRisk > 0 ? riskAmount / (pipsAtRisk * pipVal) : 0
    
    // Calculate potential profit
    const potentialProfit = tpDistance ? (tpDistance / slDistance) * riskAmount : 0
    
    // Risk to reward ratio
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
      slPips: Math.round(pipsAtRisk * 10) / 10,
      tpPips: tpDistance ? Math.round((tpDistance / 0.01) * 10) / 10 : 0,
    }
  }, [entry, sl, tp, pipValue, accountBalance, riskPercent, pair])

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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Field className="col-span-1">
            <FieldLabel htmlFor="pair" className="text-xs">Symbol</FieldLabel>
            <Input
              id="pair"
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
              className="h-9 bg-secondary border-border text-sm"
            />
          </Field>
          <Field className="col-span-1">
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
          <Field className="col-span-1">
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
          <Field className="col-span-1">
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

          {/* Results */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 flex items-end gap-3">
            <div className="flex-1 grid grid-cols-4 gap-3">
              <div className="bg-secondary rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Risk
                </p>
                <p className="text-sm font-semibold text-loss">
                  ${calculations?.riskAmount || 0}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" /> Profit
                </p>
                <p className="text-sm font-semibold text-profit">
                  ${calculations?.potentialProfit || 0}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> R:R
                </p>
                <p className={cn(
                  'text-sm font-semibold',
                  isValidRR ? 'text-profit' : 'text-muted-foreground'
                )}>
                  1:{calculations?.riskReward || 0}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Size
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {calculations?.positionSize || 0}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={!calculations || !isValidRR}
              className="h-9"
            >
              Log Trade
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
