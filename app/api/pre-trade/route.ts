import { NextRequest } from 'next/server'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { PreTradeService } from '@/lib/services/pre-trade-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleRouteError, ok } from '@/lib/utils/http'
import { createPreTradeSchema } from '@/lib/validators/pre-trade'

export async function POST(request: NextRequest) {
  try {
    const user = await guardTradingMutation(request, 'pre-trade:create')
    const payload = createPreTradeSchema.parse(await request.json())
    const db = createAdminClient()
    const service = new PreTradeService(db)
    const preTrade = await service.create(user.id, payload)

    return ok({ preTrade }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
