import { z } from 'zod'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const executionIdSchema = z.string().uuid()

export const workspaceQuerySchema = z
    .object({
        from: isoDateSchema,
        to: isoDateSchema,
        executionIds: z.array(executionIdSchema).default([]),
    })
    .strict()

export const checklistQuerySchema = z
    .object({
        executionId: executionIdSchema,
    })
    .strict()

export const saveDayNoteSchema = z
    .object({
        action: z.literal('saveDayNote'),
        journalDate: isoDateSchema,
        note: z.string().max(8000).default(''),
        aiSummary: z.string().max(8000).nullable(),
    })
    .strict()

export const addAttachmentSchema = z
    .object({
        action: z.literal('addAttachment'),
        executionId: executionIdSchema,
        imageUrl: z.string().trim().url(),
    })
    .strict()

export const journalWorkspaceActionSchema = z.discriminatedUnion('action', [saveDayNoteSchema, addAttachmentSchema])

export type WorkspaceQueryInput = z.infer<typeof workspaceQuerySchema>
export type ChecklistQueryInput = z.infer<typeof checklistQuerySchema>
export type SaveDayNoteInput = z.infer<typeof saveDayNoteSchema>
export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>
export type JournalWorkspaceActionInput = z.infer<typeof journalWorkspaceActionSchema>
