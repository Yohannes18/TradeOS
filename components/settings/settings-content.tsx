'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { Settings, DollarSign, Percent, User, Shield, CheckCircle, Mail } from 'lucide-react'

interface Settings {
  id?: string
  risk_percent: number
  account_balance: number
}

interface SettingsContentProps {
  userId: string
  userEmail: string
  userEmailVerified: boolean | null
  settings: Settings
}

export function SettingsContent({ userId, userEmail, userEmailVerified, settings }: SettingsContentProps) {
  const [riskPercent, setRiskPercent] = useState(settings.risk_percent.toString())
  const [accountBalance, setAccountBalance] = useState(settings.account_balance.toString())
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        risk_percent: parseFloat(riskPercent) || 1,
        account_balance: parseFloat(accountBalance) || 10000,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    setIsSaving(false)
    
    if (!error) {
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  return (
    <div className="page-wrap max-w-none overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Header */}
        <section className="page-hero px-6 py-6 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,160,255,0.12),transparent_24%),radial-gradient(circle_at_22%_20%,rgba(96,228,187,0.08),transparent_18%)]" />
          <div className="relative">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage account protection, platform preferences, and risk controls in one place.
          </p>
          </div>
        </section>

        {/* Account Info */}
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                value={userEmail}
                disabled
                className="bg-secondary/50 border-border text-muted-foreground"
              />
            </Field>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Email access</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userEmailVerified
                      ? 'Your email is confirmed for account recovery.'
                      : 'Email verification is optional in this personal workspace and is not required for sign-in.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-loss/10">
                <Shield className="h-4 w-4 text-loss" />
              </div>
              <div>
                <CardTitle className="text-base">Risk Management</CardTitle>
                <CardDescription>Configure your risk parameters</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="accountBalance" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                Account Balance
              </FieldLabel>
              <Input
                id="accountBalance"
                type="number"
                step="0.01"
                min="0"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your current trading account balance
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="riskPercent" className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                Risk Per Trade (%)
              </FieldLabel>
              <Input
                id="riskPercent"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum percentage of account to risk on a single trade (recommended: 1-2%)
              </p>
            </Field>

            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Risk Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Max Risk Amount</p>
                  <p className="text-xl font-bold text-loss">
                    ${((parseFloat(accountBalance) || 0) * ((parseFloat(riskPercent) || 0) / 100)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trades to Blow Account</p>
                  <p className="text-xl font-bold text-foreground">
                    {parseFloat(riskPercent) > 0 ? Math.ceil(100 / parseFloat(riskPercent)) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-profit">
              <CheckCircle className="h-4 w-4" />
              Settings saved
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
            {isSaving ? <Spinner className="h-4 w-4" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
