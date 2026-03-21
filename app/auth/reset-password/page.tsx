'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { getPasswordPolicyMessage } from '@/lib/auth/password-policy'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = useMemo(
    () => searchParams.get('token') || searchParams.get('reset_token') || '',
    [searchParams],
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!token) {
      setError('This reset link is missing a valid token.')
      setIsLoading(false)
      return
    }

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

    try {
      const result = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      })

      if (!result.ok) {
        const payload = await result.json().catch(() => null)
        setError(payload?.message || 'Unable to reset password.')
        setIsLoading(false)
        return
      }

      setSuccess('Your password has been updated. Redirecting to sign in...')
      setTimeout(() => {
        router.push('/auth/login')
      }, 1200)
    } catch {
      setError('Unable to reset password right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Finish account recovery with a stronger password."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Need to start over?{' '}
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            Request a fresh reset link
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="Enter a strong new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <PasswordStrength password={password} />
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        {success ? <p className="text-sm text-profit">{success}</p> : null}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Update Password'}
        </Button>
      </form>
    </AuthShell>
  )
}
