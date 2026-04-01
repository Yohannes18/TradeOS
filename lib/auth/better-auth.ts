import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins/email-otp'
import {
    getAuthBaseURL,
    getAuthSecret,
    getTrustedAuthOrigins,
    hasAppleOAuth,
    hasGoogleOAuth,
    isBetterAuthEnabled,
} from '@/lib/auth/config'
import { sendResetPasswordEmail, sendVerificationOtpEmail } from '@/lib/auth/email'

let cachedAuth: unknown = null

export function getBetterAuthInstance() {
    if (!isBetterAuthEnabled) return null

    if (cachedAuth) return cachedAuth as ReturnType<typeof betterAuth>

    const baseURL = getAuthBaseURL()
    const secret = getAuthSecret()
    const socialProviders = {
        ...(hasGoogleOAuth
            ? {
                  google: {
                      clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
                      clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
                  },
              }
            : {}),
        ...(hasAppleOAuth
            ? {
                  apple: {
                      clientId: process.env.BETTER_AUTH_APPLE_CLIENT_ID!,
                      clientSecret: process.env.BETTER_AUTH_APPLE_CLIENT_SECRET!,
                  },
              }
            : {}),
    }

    cachedAuth = betterAuth({
        baseURL,
        secret,
        trustedOrigins: getTrustedAuthOrigins(),
        socialProviders,
        emailAndPassword: {
            enabled: true,
            minPasswordLength: 10,
            maxPasswordLength: 128,
            requireEmailVerification: false,
            revokeSessionsOnPasswordReset: true,
            async sendResetPassword({ user, url }) {
                await sendResetPasswordEmail({
                    email: user.email,
                    name: user.name,
                    resetUrl: url,
                })
            },
        },
        advanced: {
            crossSubDomainCookies: {
                enabled: false,
            },
        },
        plugins: [
            emailOTP({
                otpLength: 6,
                expiresIn: 300,
                sendVerificationOnSignUp: false,
                overrideDefaultEmailVerification: true,
                async sendVerificationOTP({ email, otp, type }) {
                    await sendVerificationOtpEmail({ email, otp, type })
                },
            }),
        ],
    })

    return cachedAuth as ReturnType<typeof betterAuth>
}
