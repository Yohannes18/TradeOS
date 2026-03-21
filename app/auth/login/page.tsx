'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { betterAuthClient, isBetterAuthClientEnabled } from '@/lib/auth/better-auth-client'
import { sanitizeNextPath } from '@/lib/auth/redirect'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nextPath, setNextPath] = useState('/dashboard')
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNextPath(sanitizeNextPath(params.get('next')))
    const emailParam = params.get('email')
    if (emailParam) setEmail(emailParam)
  }, [])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (isBetterAuthClientEnabled) {
      const result = await betterAuthClient.signIn.email({
        email,
        password,
        callbackURL: nextPath,
      } as never)

      const maybeError = (result as { error?: { message?: string } })?.error
      if (maybeError) {
        setError(maybeError.message || 'Unable to sign in with Better Auth.')
        setIsLoading(false)
        return
      }

      router.push(nextPath)
      router.refresh()
      return
    }

    let supabase
    try {
      supabase = createClient()
    } catch {
      setError('Supabase is not configured. Add your Supabase environment variables and try again.')
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your secure trading workspace."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link href="/auth/sign-up" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Professional-grade access flow
        </p>
        <p className="mt-1">
          Stronger credential policy, safer redirects, and recovery-ready auth built around Better Auth.
        </p>
      </div>

      <OAuthButtons nextPath={nextPath} onError={(message) => setError(message || null)} />
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="email">Work Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="trader@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field>
          <div className="mb-2 flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  )
}
