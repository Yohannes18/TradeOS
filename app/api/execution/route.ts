import { NextRequest } from 'next/server'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { ExecutionService } from '@/lib/services/execution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleRouteError, ok } from '@/lib/utils/http'
import { createExecutionSchema } from '@/lib/validators/execution'

export async function POST(request: NextRequest) {
  try {
    const user = await guardTradingMutation(request, 'execution:create')
    const payload = createExecutionSchema.parse(await request.json())
    const db = createAdminClient()
    const service = new ExecutionService(db)
    const execution = await service.execute(user.id, payload)

    return ok({ execution }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
