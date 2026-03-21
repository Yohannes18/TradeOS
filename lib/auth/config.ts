export const isBetterAuthEnabled = process.env.BETTER_AUTH_ENABLED === 'true'
export const isBetterAuthClientEnabled = process.env.NEXT_PUBLIC_BETTER_AUTH_ENABLED === 'true'

export const hasGoogleOAuth =
  Boolean(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID) && Boolean(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET)

export const hasAppleOAuth =
  Boolean(process.env.BETTER_AUTH_APPLE_CLIENT_ID) && Boolean(process.env.BETTER_AUTH_APPLE_CLIENT_SECRET)

export function getAuthBaseURL() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export function getTrustedAuthOrigins() {
  const origins = new Set<string>()

  const addOrigin = (value?: string | null) => {
    if (!value) return
    try {
      origins.add(new URL(value).origin)
    } catch {
      // Ignore malformed URLs from env and keep the valid set.
    }
  }

  addOrigin(process.env.BETTER_AUTH_URL)
  addOrigin(process.env.NEXT_PUBLIC_BETTER_AUTH_URL)
  addOrigin(process.env.NEXT_PUBLIC_SITE_URL)

  const envOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  if (envOrigins) {
    for (const origin of envOrigins.split(',')) {
      addOrigin(origin.trim())
    }
  }

  if (origins.size === 0) {
    origins.add('http://localhost:3000')
  }

  return Array.from(origins)
}

export function getAuthSecret() {
  return process.env.BETTER_AUTH_SECRET || process.env.SUPABASE_JWT_SECRET || ''
}
