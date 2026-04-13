import { NextRequest } from 'next/server'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { ExecutionService } from '@/lib/services/execution-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleRouteError, ok } from '@/lib/utils/http'
import { closeExecutionSchema } from '@/lib/validators/execution'
import { uuidParamSchema } from '@/lib/validators/common'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await guardTradingMutation(request, 'execution:close')
    const params = uuidParamSchema.parse(await context.params)
    const payload = closeExecutionSchema.parse(await request.json())
    const db = createAdminClient()
    const service = new ExecutionService(db)
    const result = await service.close(user.id, params.id, payload)

    return ok(result)
  } catch (error) {
    return handleRouteError(error)
  }
}
