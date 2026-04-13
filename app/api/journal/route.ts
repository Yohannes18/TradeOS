import { NextRequest } from 'next/server'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { JournalService } from '@/lib/services/journal-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleRouteError, ok } from '@/lib/utils/http'
import { createJournalSchema } from '@/lib/validators/journal'

export async function POST(request: NextRequest) {
  try {
    const user = await guardTradingMutation(request, 'journal:create')
    const payload = createJournalSchema.parse(await request.json())
    const db = createAdminClient()
    const service = new JournalService(db)
    const journal = await service.create(user.id, payload)

    return ok({ journal }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
