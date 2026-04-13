import Decimal from 'decimal.js'
import type { TradeOutcome } from '@/lib/domain/trading'
import { roundTo } from '@/lib/validators/common'
import { ApiError } from '@/lib/utils/errors'

export function calculatePositionSize(input: {
  accountBalance: string | number
  riskPercent: string | number
  entry: string | number
  stopLoss: string | number
}) {
  const accountBalance = new Decimal(input.accountBalance)
  const riskPercent = new Decimal(input.riskPercent)
  const entry = new Decimal(input.entry)
  const stopLoss = new Decimal(input.stopLoss)
  const riskPerUnit = entry.minus(stopLoss).abs()

  if (riskPerUnit.lte(0)) {
    throw new ApiError(400, 'Entry and stop loss must define positive risk.')
  }

  const riskAmount = accountBalance.mul(riskPercent).div(100)
  const positionSize = riskAmount.div(riskPerUnit)

  return {
    riskAmount: riskAmount.toFixed(8),
    positionSize: positionSize.toFixed(8),
  }
}

export function calculateTradeMetrics(input: {
  entry: string | number
  stopLoss: string | number
  exitPrice: string | number
  positionSize: string | number
  takeProfit: string | number
}) {
  const entry = new Decimal(input.entry)
  const stopLoss = new Decimal(input.stopLoss)
  const exitPrice = new Decimal(input.exitPrice)
  const positionSize = new Decimal(input.positionSize)
  const takeProfit = new Decimal(input.takeProfit)

  const isLong = takeProfit.greaterThan(entry)
  const pnlPerUnit = isLong ? exitPrice.minus(entry) : entry.minus(exitPrice)
  const pnl = pnlPerUnit.mul(positionSize)
  const initialRiskPerUnit = entry.minus(stopLoss).abs()

  if (initialRiskPerUnit.lte(0)) {
    throw new ApiError(400, 'Execution has invalid locked risk values.')
  }

  const initialRisk = initialRiskPerUnit.mul(positionSize)
  const rrRatio = initialRisk.eq(0) ? new Decimal(0) : pnl.div(initialRisk)

  let winLoss: TradeOutcome = 'breakeven'
  if (pnl.gt(0)) {
    winLoss = 'win'
  } else if (pnl.lt(0)) {
    winLoss = 'loss'
  }

  return {
    pnl: roundTo(pnl.toNumber(), 2),
    rrRatio: roundTo(rrRatio.toNumber(), 4),
    winLoss,
  }
}
