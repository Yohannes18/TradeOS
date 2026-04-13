import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreatePreTradeInput } from '@/lib/validators/pre-trade'
import { PreTradeRepository } from '@/lib/repositories/pre-trade-repository'
import {
  calculateAiScore,
  calculateChecklistScore,
  calculateFinalScore,
  calculateMacroScore,
  resolveVerdict,
} from '@/lib/services/scoring-service'

type DbClient = SupabaseClient<any, 'public', any>

export class PreTradeService {
  private readonly repository: PreTradeRepository

  constructor(db: DbClient) {
    this.repository = new PreTradeRepository(db)
  }

  async create(userId: string, input: CreatePreTradeInput) {
    const checklistScore = calculateChecklistScore(input.checklist)
    const aiScore = calculateAiScore(input.checklist, input.entry, input.stop_loss, input.take_profit, input.risk_percent)
    const macroScore = calculateMacroScore(input.checklist)
    const finalScore = calculateFinalScore(checklistScore, aiScore, macroScore)
    const aiVerdict = resolveVerdict(finalScore)
    const status = aiVerdict === 'AUTHORIZED' ? 'validated' : 'rejected'

    return this.repository.create({
      user_id: userId,
      pair: input.pair,
      entry: input.entry.toFixed(8),
      stop_loss: input.stop_loss.toFixed(8),
      take_profit: input.take_profit.toFixed(8),
      risk_percent: input.risk_percent.toFixed(4),
      checklist: input.checklist,
      checklist_score: checklistScore,
      ai_verdict: aiVerdict,
      ai_score: aiScore,
      macro_score: macroScore,
      final_score: finalScore,
      status,
    })
  }
}
