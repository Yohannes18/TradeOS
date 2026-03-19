import { createAuthClient } from 'better-auth/client'

export const isBetterAuthClientEnabled = process.env.NEXT_PUBLIC_BETTER_AUTH_ENABLED === 'true'

const baseURL =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'

export const betterAuthClient = createAuthClient({
    baseURL,
})
