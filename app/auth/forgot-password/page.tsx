'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { buildAbsoluteUrl } from '@/lib/auth/redirect'
import { isBetterAuthClientEnabled } from '@/lib/auth/better-auth-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!isBetterAuthClientEnabled) {
      setError('Password reset is only configured for Better Auth in this workspace right now.')
      setIsLoading(false)
      return
    }

    try {
      const result = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirectTo: buildAbsoluteUrl('/auth/reset-password'),
        }),
      })

      if (!result.ok) {
        const payload = await result.json().catch(() => null)
        setError(payload?.message || 'Unable to start password reset.')
        setIsLoading(false)
        return
      }

      setSuccess('If an account exists for that email, reset instructions have been sent.')
    } catch {
      setError('Unable to start password reset right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Request a secure reset link to regain account access."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="trader@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        {success ? <p className="text-sm text-profit">{success}</p> : null}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Send Reset Link'}
        </Button>
      </form>
    </AuthShell>
  )
}
