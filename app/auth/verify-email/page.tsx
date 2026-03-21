'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { isBetterAuthClientEnabled } from '@/lib/auth/better-auth-client'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialEmail = params.get('email')
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [])

  const handleSendCode = async () => {
    if (!email) return

    setIsSendingCode(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/email-otp/send-verification-otp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: 'email-verification',
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Unable to send verification code.')
      }

      setSuccess(`Verification code sent to ${email}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification code.')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault()
    setIsVerifying(true)
    setError(null)
    setSuccess(null)

    if (!isBetterAuthClientEnabled) {
      setError('Email verification OTP is only configured for Better Auth in this workspace.')
      setIsVerifying(false)
      return
    }

    try {
      const response = await fetch('/api/auth/email-otp/verify-email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Invalid or expired verification code.')
      }

      router.push(`/auth/login?verified=1&email=${encodeURIComponent(email)}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify email.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      description="Enter the 6-digit code sent to your inbox to unlock sign-in."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Back to{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleVerify} className="flex flex-col gap-4">
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
        <Field>
          <div className="mb-2 flex items-center justify-between gap-2">
            <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
            <Button type="button" variant="ghost" className="h-auto px-0 text-xs" onClick={handleSendCode} disabled={isSendingCode || !email}>
              {isSendingCode ? 'Sending…' : 'Resend code'}
            </Button>
          </div>
          <Input
            id="otp"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="123456"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        {success ? <p className="text-sm text-profit">{success}</p> : null}
        <Button type="submit" className="w-full" disabled={isVerifying}>
          {isVerifying ? <Spinner className="h-4 w-4" /> : 'Verify Email'}
        </Button>
      </form>
    </AuthShell>
  )
}
