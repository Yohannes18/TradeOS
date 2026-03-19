import { toNextJsHandler } from 'better-auth/next-js'
import { getBetterAuthInstance, isBetterAuthEnabled } from '@/lib/auth/better-auth'

const disabledResponse = () =>
    Response.json(
        {
            error: 'Better Auth is disabled.',
            message: 'Set BETTER_AUTH_ENABLED=true and configure BETTER_AUTH_SECRET/BETTER_AUTH_URL to enable.',
        },
        { status: 501 },
    )

const handler = async (request: Request) => {
    if (!isBetterAuthEnabled) {
        return disabledResponse()
    }

    const auth = getBetterAuthInstance()
    if (!auth) {
        return disabledResponse()
    }

    return toNextJsHandler(auth).GET(request)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
