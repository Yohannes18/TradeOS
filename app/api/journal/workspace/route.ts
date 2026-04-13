import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { JournalWorkspaceService } from '@/lib/services/journal-workspace-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError } from '@/lib/utils/errors'
import { handleRouteError, ok } from '@/lib/utils/http'
import {
    checklistQuerySchema,
    type ChecklistQueryInput,
    journalWorkspaceActionSchema,
    type WorkspaceQueryInput,
    workspaceQuerySchema,
} from '@/lib/validators/journal-workspace'

function parseExecutionIds(value: string | null): string[] {
    if (!value) return []
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
}

function parseWorkspaceQuery(url: URL): WorkspaceQueryInput {
    return workspaceQuerySchema.parse({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        executionIds: parseExecutionIds(url.searchParams.get('executionIds')),
    })
}

function parseChecklistQuery(url: URL): ChecklistQueryInput {
    return checklistQuerySchema.parse({
        executionId: url.searchParams.get('executionId'),
    })
}

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser()
        if (!user) {
            throw new ApiError(401, 'Authentication required.')
        }

        const url = new URL(request.url)
        const executionId = url.searchParams.get('executionId')
        const service = new JournalWorkspaceService(createAdminClient())

        if (executionId) {
            const parsed = parseChecklistQuery(url)
            const checklist = await service.getChecklist({ userId: user.id, executionId: parsed.executionId })
            return ok({ checklist })
        }

        const parsed = parseWorkspaceQuery(url)

        const data = await service.getWorkspaceData({
            userId: user.id,
            from: parsed.from,
            to: parsed.to,
            executionIds: parsed.executionIds,
        })

        return ok(data)
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await guardTradingMutation(request, 'journal:workspace')
        const body = journalWorkspaceActionSchema.parse(await request.json())
        const service = new JournalWorkspaceService(createAdminClient())

        if (body.action === 'saveDayNote') {
            const entry = await service.saveDayNote({
                userId: user.id,
                journalDate: body.journalDate,
                note: body.note,
                aiSummary: body.aiSummary,
            })
            return ok({ entry })
        }

        const image = await service.addAttachment({
            userId: user.id,
            executionId: body.executionId,
            imageUrl: body.imageUrl,
        })

        return ok({ image }, { status: 201 })
    } catch (error) {
        return handleRouteError(error)
    }
}
