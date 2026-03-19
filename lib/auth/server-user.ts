import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getBetterAuthInstance } from '@/lib/auth/better-auth'

export type AuthenticatedUser = {
    id: string
    email?: string | null
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    const betterAuthEnabled = process.env.BETTER_AUTH_ENABLED === 'true'

    if (betterAuthEnabled) {
        try {
            const auth = getBetterAuthInstance()
            if (!auth) return null

            const requestHeaders = new Headers(await headers())
            const sessionResponse = await auth.api.getSession({ headers: requestHeaders } as never)

            const sessionUser =
                (sessionResponse as { user?: { id?: string; email?: string | null } })?.user ||
                (sessionResponse as { data?: { user?: { id?: string; email?: string | null } } })?.data?.user ||
                (sessionResponse as { session?: { user?: { id?: string; email?: string | null } } })?.session?.user

            if (sessionUser?.id) {
                return {
                    id: sessionUser.id,
                    email: sessionUser.email ?? null,
                }
            }

            return null
        } catch {
            return null
        }
    }

    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return null

        return {
            id: user.id,
            email: user.email ?? null,
        }
    } catch {
        return null
    }
}
