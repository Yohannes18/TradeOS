import type { SupabaseClient } from '@supabase/supabase-js'
import type { CloseExecutionInput, CreateExecutionInput } from '@/lib/validators/execution'
import { ExecutionRepository } from '@/lib/repositories/execution-repository'
import { PreTradeRepository } from '@/lib/repositories/pre-trade-repository'
import { SettingsRepository } from '@/lib/repositories/settings-repository'
import { TradeMetricsRepository } from '@/lib/repositories/trade-metrics-repository'
import { calculatePositionSize, calculateTradeMetrics } from '@/lib/services/risk-service'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

export class ExecutionService {
  private readonly preTrades: PreTradeRepository
  private readonly executions: ExecutionRepository
  private readonly settings: SettingsRepository
  private readonly metrics: TradeMetricsRepository

  constructor(db: DbClient) {
    this.preTrades = new PreTradeRepository(db)
    this.executions = new ExecutionRepository(db)
    this.settings = new SettingsRepository(db)
    this.metrics = new TradeMetricsRepository(db)
  }

  async execute(userId: string, input: CreateExecutionInput) {
    const preTrade = await this.preTrades.getOwnedById(input.preTradeId, userId)

    if (!preTrade) {
      throw new ApiError(404, 'Validated pre-trade not found.')
    }

    if (preTrade.status !== 'validated' || preTrade.ai_verdict !== 'AUTHORIZED' || preTrade.final_score < 0.7) {
      throw new ApiError(409, 'Execution requires a validated pre-trade.')
    }

    const profile = await this.settings.getRiskProfile(userId)
    const appliedRiskPercent = preTrade.risk_percent || profile.risk_percent
    const sizing = calculatePositionSize({
      accountBalance: profile.account_balance,
      riskPercent: appliedRiskPercent,
      entry: preTrade.entry,
      stopLoss: preTrade.stop_loss,
    })

    return this.executions.create({
      user_id: userId,
      pre_trade_id: preTrade.id,
      entry: preTrade.entry,
      stop_loss: preTrade.stop_loss,
      take_profit: preTrade.take_profit,
      risk_percent: appliedRiskPercent,
      position_size: sizing.positionSize,
    })
  }

  async close(userId: string, executionId: string, input: CloseExecutionInput) {
    const execution = await this.executions.getOwnedById(executionId, userId)

    if (!execution) {
      throw new ApiError(404, 'Execution not found.')
    }

    if (execution.status !== 'executed') {
      throw new ApiError(409, 'Execution is already closed.')
    }

    const metrics = calculateTradeMetrics({
      entry: execution.entry,
      stopLoss: execution.stop_loss,
      takeProfit: execution.take_profit,
      exitPrice: input.exitPrice,
      positionSize: execution.position_size,
    })

    await this.executions.closeAtomically({
      executionId,
      userId,
      closePrice: input.exitPrice.toFixed(8),
      pnl: metrics.pnl,
      rrRatio: metrics.rrRatio,
      winLoss: metrics.winLoss,
    })
    const closedExecution = await this.executions.getOwnedById(executionId, userId)
    const tradeMetrics = await this.metrics.getByExecutionId(executionId)

    if (!closedExecution || !tradeMetrics) {
      throw new ApiError(500, 'Execution closed but result snapshot could not be loaded.')
    }

    return {
      execution: closedExecution,
      metrics: tradeMetrics,
    }
  }
}
