export const PRE_TRADE_STATUSES = ['draft', 'validated', 'rejected'] as const
export const AI_VERDICTS = ['AUTHORIZED', 'INVALID', 'STANDBY'] as const
export const EXECUTION_STATUSES = ['executed', 'closed'] as const
export const JOURNAL_EMOTIONS = [
  'calm',
  'confident',
  'disciplined',
  'anxious',
  'fearful',
  'greedy',
  'impatient',
  'revenge',
] as const
export const JOURNAL_MISTAKES = [
  'late_entry',
  'early_exit',
  'moved_stop',
  'overrisked',
  'ignored_plan',
  'forced_trade',
  'news_trade',
  'fomo',
] as const
export const TRADE_OUTCOMES = ['win', 'loss', 'breakeven'] as const

export type PreTradeStatus = (typeof PRE_TRADE_STATUSES)[number]
export type AIVerdict = (typeof AI_VERDICTS)[number]
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number]
export type JournalEmotion = (typeof JOURNAL_EMOTIONS)[number]
export type JournalMistake = (typeof JOURNAL_MISTAKES)[number]
export type TradeOutcome = (typeof TRADE_OUTCOMES)[number]

export type ChecklistPayload = {
  setup: {
    thesisClear: boolean
    trendAligned: boolean
    liquidityMapped: boolean
    riskDefined: boolean
    rrAcceptable: boolean
    sessionAligned: boolean
    newsClear: boolean
    disciplineReady: boolean
  }
  aiContext: {
    confidence: number
    structureAlignment: 'aligned' | 'mixed' | 'counter'
    regime: 'trend' | 'range' | 'breakout'
  }
  macroContext: {
    biasAlignment: 'aligned' | 'mixed' | 'counter'
    eventRisk: 'low' | 'medium' | 'high'
    volatility: 'low' | 'normal' | 'high'
    sessionQuality: 'poor' | 'fair' | 'good'
  }
  notes?: string
}

export type PreTrade = {
  id: string
  user_id: string
  pair: string
  entry: string
  stop_loss: string
  take_profit: string
  risk_percent: string
  checklist: ChecklistPayload
  checklist_score: number
  ai_verdict: AIVerdict
  ai_score: number
  macro_score: number
  final_score: number
  status: PreTradeStatus
  created_at: string
}

export type Execution = {
  id: string
  user_id: string
  pre_trade_id: string
  entry: string
  stop_loss: string
  take_profit: string
  risk_percent: string
  position_size: string
  close_price: string | null
  status: ExecutionStatus
  executed_at: string
  closed_at: string | null
}

export type Journal = {
  id: string
  execution_id: string
  user_id: string
  emotions: JournalEmotion[]
  mistakes: JournalMistake[]
  adherence_score: number
  notes: string | null
  created_at: string
}

export type TradeMetrics = {
  id: string
  execution_id: string
  rr_ratio: number
  pnl: number
  win_loss: TradeOutcome
  computed_at: string
}

export type RiskProfile = {
  account_balance: string
  risk_percent: string
}

export type TradingAnalyticsOverview = {
  openExecutions: number
  closedExecutions: number
  journalsCompleted: number
  winRate: number
  netPnl: number
  averageRr: number
  averageAdherence: number
}
