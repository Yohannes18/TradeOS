import { createAuthClient } from 'better-auth/client'
import { emailOTPClient } from 'better-auth/client/plugins'
import { getAuthBaseURL, isBetterAuthClientEnabled } from '@/lib/auth/config'

const baseURL = getAuthBaseURL()

export const betterAuthClient = createAuthClient({
    baseURL,
    plugins: [emailOTPClient()],
})

export { isBetterAuthClientEnabled }
