export type SessionValue = 'london' | 'ny' | 'asia'
export type SessionValueOrUnknown = SessionValue | 'unknown'

export const SESSION_VALUES: SessionValue[] = ['london', 'ny', 'asia']

export const SESSION_LABELS: Record<SessionValue, string> = {
    london: 'London',
    ny: 'New York',
    asia: 'Asia',
}

export function normalizeSessionValue(session?: string | null, notes?: string | null): SessionValueOrUnknown {
    if (session === 'london' || session === 'ny' || session === 'asia') return session

    const normalizedSession = (session || '').toLowerCase().trim()
    if (normalizedSession === 'new-york' || normalizedSession === 'new york' || normalizedSession === 'newyork') {
        return 'ny'
    }

    const normalizedNotes = (notes || '').toLowerCase()
    if (normalizedNotes.includes('london')) return 'london'
    if (normalizedNotes.includes('new york') || normalizedNotes.includes('new-york') || normalizedNotes.includes('ny')) return 'ny'
    if (normalizedNotes.includes('asia')) return 'asia'

    return 'unknown'
}

export function sessionLabel(value: SessionValueOrUnknown): string {
    if (value !== 'unknown') return SESSION_LABELS[value]
    return '-'
}
