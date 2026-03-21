import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="Authentication error"
      description="We couldn’t complete that auth action safely."
      footer={
        <div className="flex flex-col gap-3">
          <Link href="/auth/login">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">Go Home</Button>
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-loss/20 bg-loss/10 p-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-loss/20">
          <AlertTriangle className="h-6 w-6 text-loss" />
        </div>
        <p className="text-sm text-muted-foreground">
          Something went wrong during authentication. This can happen if a callback expired, a reset link is invalid, or the auth provider configuration needs attention.
        </p>
      </div>
    </AuthShell>
  )
}
