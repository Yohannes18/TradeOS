'use client'

import { Check, X } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { validatePasswordPolicy } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const policy = validatePasswordPolicy(password)
  const items = [
    ['10+ characters', policy.checks.length],
    ['Uppercase letter', policy.checks.upper],
    ['Lowercase letter', policy.checks.lower],
    ['Number', policy.checks.number],
    ['Symbol', policy.checks.symbol],
  ] as const

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Password strength</span>
        <span
          className={cn(
            'font-medium',
            policy.score >= 5 ? 'text-profit' : policy.score >= 4 ? 'text-primary' : policy.score >= 3 ? 'text-chart-4' : 'text-loss',
          )}
        >
          {policy.label}
        </span>
      </div>
      <Progress value={policy.score * 20} className="h-2" />
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(([label, passed]) => (
          <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
            {passed ? <Check className="h-3.5 w-3.5 text-profit" /> : <X className="h-3.5 w-3.5 text-loss" />}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
