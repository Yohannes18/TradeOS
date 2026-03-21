'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { CheckCircle } from 'lucide-react'

import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { betterAuthClient, isBetterAuthClientEnabled } from '@/lib/auth/better-auth-client'
import { buildOAuthRedirectTo } from '@/lib/auth/redirect'
import { getPasswordPolicyMessage } from '@/lib/auth/password-policy'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('Confirmation instructions were sent to')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    const passwordPolicyError = getPasswordPolicyMessage(password)
    if (passwordPolicyError) {
      setError(passwordPolicyError)
      setIsLoading(false)
      return
    }

    if (isBetterAuthClientEnabled) {
      const result = await betterAuthClient.signUp.email({
        email,
        password,
        name: email.split('@')[0],
        callbackURL: '/dashboard',
      } as never)

      const maybeError = (result as { error?: { message?: string } })?.error
      if (maybeError) {
        setError(maybeError.message || 'Unable to create account with Better Auth.')
        setIsLoading(false)
        return
      }

      setSuccessMessage('Your account is ready for')
      setIsSuccess(true)
      setIsLoading(false)
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildOAuthRedirectTo('/dashboard'),
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setSuccessMessage('Confirmation instructions were sent to')
    setIsSuccess(true)
    setIsLoading(false)
  }

  if (isSuccess) {
    return (
      <AuthShell
        title="Account created"
        description="Your account is ready to use."
        footer={
          <Link href="/auth/login">
            <Button className="w-full">
              Continue to Sign In
            </Button>
          </Link>
        }
      >
        <div className="rounded-2xl border border-profit/20 bg-profit/10 p-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-profit/20">
            <CheckCircle className="h-6 w-6 text-profit" />
          </div>
          <p className="text-sm text-muted-foreground">
            {successMessage} <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      description="Set up a secure account built for a premium trading workspace."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <OAuthButtons onError={(message) => setError(message || null)} />
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or create with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <PasswordStrength password={password} />
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  )
}
