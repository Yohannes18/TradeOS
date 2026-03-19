export function sanitizeNextPath(candidate: string | null | undefined, fallback = '/dashboard') {
    if (!candidate) return fallback

    let value = candidate
    try {
        value = decodeURIComponent(candidate)
    } catch {
        value = candidate
    }

    if (!value.startsWith('/') || value.startsWith('//')) {
        return fallback
    }

    return value
}

export function buildOAuthRedirectTo(nextPath = '/dashboard') {
    const safeNextPath = sanitizeNextPath(nextPath)
    const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (explicitSiteUrl) {
        return `${explicitSiteUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
    }

    const devRedirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
    if (devRedirectUrl) {
        try {
            const url = new URL(devRedirectUrl)
            return `${url.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
        } catch {
            // Ignore malformed URL and continue to window fallback.
        }
    }

    if (typeof window !== 'undefined') {
        return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
    }

    return `/auth/callback?next=${encodeURIComponent(safeNextPath)}`
}
