'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShieldCheck, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthShellProps {
  title: string
  description: string
  eyebrow?: string
  footer?: ReactNode
  children: ReactNode
}

export function AuthShell({ title, description, eyebrow = 'Secure Trading Workspace', footer, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(117,156,255,0.16),_transparent_26%),radial-gradient(circle_at_80%_16%,_rgba(112,234,192,0.12),_transparent_20%),linear-gradient(180deg,rgba(11,15,28,1)_0%,rgba(16,20,34,1)_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_480px]">
        <div className="hidden lg:block">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Calm, trusted access for a premium trading product.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Cleaner onboarding, sharper recovery flows, and polished account protection that feels commercial from the first screen.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-sm font-medium text-foreground">Protected sessions</p>
                <p className="mt-1 text-sm text-muted-foreground">Safer redirects, origin-aware Better Auth config, and stronger credential policy.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-sm font-medium text-foreground">Commercial polish</p>
                <p className="mt-1 text-sm text-muted-foreground">Recovery flows, clearer error states, and a cleaner entry point for high-trust SaaS UX.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-white/8 bg-card/88 shadow-[0_28px_80px_rgba(4,10,26,0.5)] backdrop-blur-2xl">
          <CardHeader className="text-center">
            <Link href="/" className="mb-4 inline-flex items-center justify-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_30px_rgba(90,135,255,0.3)]">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-semibold tracking-tight text-foreground">TradeOS</span>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Secure Access</span>
              </div>
            </Link>
            <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {children}
            {footer}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
