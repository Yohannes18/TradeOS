'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Apple, Chrome, Loader2 } from 'lucide-react'
import { buildOAuthRedirectTo } from '@/lib/auth/redirect'

interface OAuthButtonsProps {
    nextPath?: string
    onError?: (message: string) => void
}

type OAuthProvider = 'google' | 'apple'

export function OAuthButtons({ nextPath = '/dashboard', onError }: OAuthButtonsProps) {
    const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null)

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        setLoadingProvider(provider)
        onError?.('')

        let supabase
        try {
            supabase = createClient()
        } catch {
            onError?.('Supabase is not configured. Add your Supabase environment variables and try again.')
            setLoadingProvider(null)
            return
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: buildOAuthRedirectTo(nextPath),
                queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
            },
        })

        if (error) {
            onError?.(error.message)
            setLoadingProvider(null)
            return
        }
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loadingProvider !== null}
                onClick={() => handleOAuthSignIn('google')}
            >
                {loadingProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
                Continue with Google
            </Button>
            <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loadingProvider !== null}
                onClick={() => handleOAuthSignIn('apple')}
            >
                {loadingProvider === 'apple' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Apple className="h-4 w-4" />}
                Continue with Apple
            </Button>
        </div>
    )
}
