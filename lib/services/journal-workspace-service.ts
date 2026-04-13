import type { SupabaseClient } from '@supabase/supabase-js'
import { JournalWorkspaceRepository } from '@/lib/repositories/journal-workspace-repository'
import { ApiError } from '@/lib/utils/errors'
import type {
    AddAttachmentInput,
    ChecklistQueryInput,
    SaveDayNoteInput,
    WorkspaceQueryInput,
} from '@/lib/validators/journal-workspace'

type DbClient = SupabaseClient<any, 'public', any>

type WorkspaceDataInput = WorkspaceQueryInput & { userId: string }
type ChecklistInput = ChecklistQueryInput & { userId: string }
type SaveDayNoteServiceInput = Omit<SaveDayNoteInput, 'action'> & { userId: string }
type AddAttachmentServiceInput = Omit<AddAttachmentInput, 'action'> & { userId: string }

export class JournalWorkspaceService {
    private readonly repository: JournalWorkspaceRepository

    constructor(db: DbClient) {
        this.repository = new JournalWorkspaceRepository(db)
    }

    private async assertOwnedExecution(userId: string, executionId: string) {
        const ownedExecutionIds = await this.repository.getOwnedExecutionIds(userId, [executionId])
        if (!ownedExecutionIds.length) {
            throw new ApiError(404, 'Execution not found.')
        }
    }

    async getWorkspaceData(input: WorkspaceDataInput) {
        const ownedExecutionIds = await this.repository.getOwnedExecutionIds(input.userId, input.executionIds)
        const entries = await this.repository.getDailyEntries(input.userId, input.from, input.to)
        const images = await this.repository.getTradeImages(ownedExecutionIds)

        return {
            entries,
            images,
        }
    }

    async getChecklist(input: ChecklistInput) {
        await this.assertOwnedExecution(input.userId, input.executionId)
        return this.repository.getLatestChecklist(input.userId, input.executionId)
    }

    async saveDayNote(input: SaveDayNoteServiceInput) {
        return this.repository.upsertDailyEntry(input)
    }

    async addAttachment(input: AddAttachmentServiceInput) {
        await this.assertOwnedExecution(input.userId, input.executionId)
        return this.repository.createAttachment(input.executionId, input.imageUrl)
    }
}
