import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/utils/errors'
import { JournalService } from '@/lib/services/journal-service'

const { mockGetOwnedById, mockGetByExecution, mockCreateJournal } = vi.hoisted(() => ({
  mockGetOwnedById: vi.fn(),
  mockGetByExecution: vi.fn(),
  mockCreateJournal: vi.fn(),
}))

vi.mock('@/lib/repositories/execution-repository', () => ({
  ExecutionRepository: vi.fn().mockImplementation(() => ({
    getOwnedById: mockGetOwnedById,
  })),
}))

vi.mock('@/lib/repositories/journal-repository', () => ({
  JournalRepository: vi.fn().mockImplementation(() => ({
    getByExecution: mockGetByExecution,
    create: mockCreateJournal,
  })),
}))

describe('JournalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOwnedById.mockResolvedValue({ id: 'exec-1', user_id: 'user-1', status: 'closed' })
    mockGetByExecution.mockResolvedValue(null)
    mockCreateJournal.mockResolvedValue({ id: 'journal-1' })
  })

  it('creates a journal for an owned execution', async () => {
    const service = new JournalService({} as never)

    const journal = await service.create('user-1', {
      execution_id: 'exec-1',
      emotions: ['calm'],
      mistakes: [],
      adherence_score: 0.9,
      notes: 'Followed plan',
    })

    expect(journal.id).toBe('journal-1')
    expect(mockGetOwnedById).toHaveBeenCalledWith('exec-1', 'user-1')
    expect(mockCreateJournal).toHaveBeenCalledWith(
      expect.objectContaining({
        execution_id: 'exec-1',
        user_id: 'user-1',
      }),
    )
  })

  it('rejects duplicate journals for the same execution', async () => {
    mockGetByExecution.mockResolvedValue({ id: 'journal-1' })
    const service = new JournalService({} as never)

    await expect(
      service.create('user-1', {
        execution_id: 'exec-1',
        emotions: ['calm'],
        mistakes: [],
        adherence_score: 0.9,
      }),
    ).rejects.toMatchObject({
      status: 409,
    })
  })

  it('rejects journals for executions the user does not own', async () => {
    mockGetOwnedById.mockResolvedValue(null)
    const service = new JournalService({} as never)

    await expect(
      service.create('user-1', {
        execution_id: 'exec-1',
        emotions: ['calm'],
        mistakes: [],
        adherence_score: 0.9,
      }),
    ).rejects.toMatchObject({
      status: 404,
    })
  })

  it('rejects journals for executions that are not closed', async () => {
    mockGetOwnedById.mockResolvedValue({ id: 'exec-1', user_id: 'user-1', status: 'executed' })
    const service = new JournalService({} as never)

    await expect(
      service.create('user-1', {
        execution_id: 'exec-1',
        emotions: ['calm'],
        mistakes: [],
        adherence_score: 0.9,
      }),
    ).rejects.toMatchObject({
      status: 409,
    })
    expect(mockCreateJournal).not.toHaveBeenCalled()
  })
})