import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/utils/errors'

type DbClient = SupabaseClient<any, 'public', any>

const SELECT_DAILY_ENTRIES = 'id, journal_date, note, ai_summary, updated_at'
const SELECT_TRADE_IMAGES = 'id, trade_id, image_url, created_at'
const SELECT_CHECKLIST = 'id, context_score, setup_score, execution_score, total_score, data'

export type DailyJournalEntryRecord = {
    id: string
    journal_date: string
    note: string | null
    ai_summary: string | null
    updated_at: string | null
}

export type TradeImageRecord = {
    id: string
    trade_id: string
    image_url: string
    created_at: string
}

export type ChecklistRecord = {
    id: string
    context_score: number | null
    setup_score: number | null
    execution_score: number | null
    total_score: number | null
    data: Record<string, unknown> | null
}

export class JournalWorkspaceRepository {
    constructor(private readonly db: DbClient) { }

    private throwDbError(message: string, details?: string): never {
        throw new ApiError(500, message, details)
    }

    async getOwnedExecutionIds(userId: string, executionIds: string[]): Promise<string[]> {
        if (!executionIds.length) return []

        const { data, error } = await this.db
            .from('executions')
            .select('id')
            .eq('user_id', userId)
            .in('id', executionIds)

        if (error) {
            this.throwDbError('Failed to verify execution ownership.', error.message)
        }

        return (data ?? []).map((row: { id: string }) => row.id)
    }

    async getDailyEntries(userId: string, from: string, to: string): Promise<DailyJournalEntryRecord[]> {
        const { data, error } = await this.db
            .from('daily_journal_entries')
            .select(SELECT_DAILY_ENTRIES)
            .eq('user_id', userId)
            .gte('journal_date', from)
            .lte('journal_date', to)

        if (error) {
            this.throwDbError('Failed to load daily journal entries.', error.message)
        }

        return (data as DailyJournalEntryRecord[]) ?? []
    }

    async getTradeImages(executionIds: string[]): Promise<TradeImageRecord[]> {
        if (!executionIds.length) return []

        const { data, error } = await this.db
            .from('trade_images')
            .select(SELECT_TRADE_IMAGES)
            .in('trade_id', executionIds)
            .order('created_at', { ascending: false })

        if (error) {
            this.throwDbError('Failed to load trade attachments.', error.message)
        }

        return (data as TradeImageRecord[]) ?? []
    }

    async getLatestChecklist(userId: string, executionId: string): Promise<ChecklistRecord | null> {
        const { data, error } = await this.db
            .from('checklist_logs')
            .select(SELECT_CHECKLIST)
            .eq('user_id', userId)
            .eq('trade_id', executionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            this.throwDbError('Failed to load checklist details.', error.message)
        }

        return (data as ChecklistRecord | null) ?? null
    }

    async upsertDailyEntry(input: {
        userId: string
        journalDate: string
        note: string
        aiSummary: string | null
    }): Promise<DailyJournalEntryRecord> {
        const { data, error } = await this.db
            .from('daily_journal_entries')
            .upsert(
                {
                    user_id: input.userId,
                    journal_date: input.journalDate,
                    note: input.note,
                    ai_summary: input.aiSummary,
                },
                { onConflict: 'user_id,journal_date' },
            )
            .select(SELECT_DAILY_ENTRIES)
            .single()

        if (error || !data) {
            this.throwDbError('Failed to save day note.', error?.message)
        }

        return data as DailyJournalEntryRecord
    }

    async createAttachment(executionId: string, imageUrl: string): Promise<TradeImageRecord> {
        const { data, error } = await this.db
            .from('trade_images')
            .insert({
                trade_id: executionId,
                image_url: imageUrl,
            })
            .select(SELECT_TRADE_IMAGES)
            .single()

        if (error || !data) {
            this.throwDbError('Failed to save attachment.', error?.message)
        }

        return data as TradeImageRecord
    }
}
