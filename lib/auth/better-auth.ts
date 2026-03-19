import { betterAuth } from 'better-auth'

export const isBetterAuthEnabled = process.env.BETTER_AUTH_ENABLED === 'true'

let cachedAuth: unknown = null

export function getBetterAuthInstance() {
    if (!isBetterAuthEnabled) return null

    if (cachedAuth) return cachedAuth as ReturnType<typeof betterAuth>

    const baseURL =
        process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'http://localhost:3000'

    const secret =
        process.env.BETTER_AUTH_SECRET ||
        process.env.SUPABASE_JWT_SECRET ||
        'change-this-in-production'

    cachedAuth = betterAuth({
        baseURL,
        secret,
    })

    return cachedAuth as ReturnType<typeof betterAuth>
}
