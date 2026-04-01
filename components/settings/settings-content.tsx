'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Settings, DollarSign, Percent, User, Shield, CheckCircle,
    Globe, Bell, ChartCandlestick, Palette
} from 'lucide-react'

interface UserSettings {
    id?: string
    risk_percent: number
    account_balance: number
    default_pair?: string
    timezone?: string
    notifications_enabled?: boolean
    theme?: string
}

interface SettingsContentProps {
    userId: string
    userEmail: string
    userEmailVerified: boolean | null
    settings: UserSettings
}

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USTEC100', 'US500', 'USOIL', 'BTCUSD']
const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney']
const RISK_PRESETS = [0.5, 1, 1.5, 2, 2.5]

export function SettingsContent({ userId, userEmail, userEmailVerified, settings }: SettingsContentProps) {
    const [riskPercent, setRiskPercent] = useState(settings.risk_percent.toString())
    const [accountBalance, setAccountBalance] = useState(settings.account_balance.toString())
    const [defaultPair, setDefaultPair] = useState(settings.default_pair || 'XAUUSD')
    const [timezone, setTimezone] = useState(settings.timezone || 'UTC')
    const [notifications, setNotifications] = useState(settings.notifications_enabled ?? true)
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()

    const handleSave = async () => {
        setIsSaving(true)
        const rp = parseFloat(riskPercent) || 1
        const ab = parseFloat(accountBalance) || 10000

        if (rp < 0.1 || rp > 10) {
            toast.error('Risk % must be between 0.1 and 10')
            setIsSaving(false)
            return
        }

        const { error } = await supabase
            .from('settings')
            .upsert({
                user_id: userId,
                risk_percent: rp,
                account_balance: ab,
                default_pair: defaultPair,
                timezone,
                notifications_enabled: notifications,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        setIsSaving(false)
        if (error) {
            toast.error('Failed to save: ' + error.message)
        } else {
            toast.success('Settings saved')
        }
    }

    return (
        <div className="page-wrap overflow-auto pb-20">
            <header className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                        <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
                        <h1 className="text-xl font-semibold tracking-tight">Account & Preferences</h1>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Risk Management */}
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Risk Management</CardTitle>
                        </div>
                        <CardDescription>Core parameters used by the risk calculator on every trade.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="balance">Account Balance ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="balance"
                                    type="number"
                                    min="100"
                                    step="100"
                                    value={accountBalance}
                                    onChange={e => setAccountBalance(e.target.value)}
                                    className="border-white/10 bg-white/5 pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="risk">Risk Per Trade (%)</Label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="risk"
                                    type="number"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={riskPercent}
                                    onChange={e => setRiskPercent(e.target.value)}
                                    className="border-white/10 bg-white/5 pl-9"
                                />
                            </div>
                            <div className="flex gap-2">
                                {RISK_PRESETS.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setRiskPercent(p.toString())}
                                        className={cn(
                                            'rounded-lg border px-2.5 py-1 text-xs transition-all',
                                            parseFloat(riskPercent) === p
                                                ? 'border-primary/60 bg-primary/15 text-primary'
                                                : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                        )}
                                    >
                                        {p}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Live preview */}
                        <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                            <p className="text-xs text-muted-foreground">Risk per trade preview</p>
                            <p className="mt-1 text-lg font-semibold text-profit">
                                ${((parseFloat(accountBalance) || 0) * (parseFloat(riskPercent) || 0) / 100).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                on a ${Number(accountBalance).toLocaleString()} account at {riskPercent}% risk
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Trading Preferences */}
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <ChartCandlestick className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Trading Preferences</CardTitle>
                        </div>
                        <CardDescription>Defaults applied when opening the trade workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Default Instrument</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {PAIRS.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setDefaultPair(p)}
                                        className={cn(
                                            'rounded-lg border px-2.5 py-1.5 text-xs transition-all',
                                            defaultPair === p
                                                ? 'border-primary/60 bg-primary/15 text-primary'
                                                : 'border-white/10 bg-white/4 text-muted-foreground hover:bg-white/8'
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <select
                                    id="timezone"
                                    value={timezone}
                                    onChange={e => setTimezone(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-foreground"
                                >
                                    {TIMEZONES.map(tz => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Account */}
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Account</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                            <p className="text-xs text-muted-foreground">Email</p>
                            <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm font-medium">{userEmail}</p>
                                {userEmailVerified && (
                                    <CheckCircle className="h-3.5 w-3.5 text-profit" />
                                )}
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                            <p className="text-xs text-muted-foreground">Member since</p>
                            <p className="mt-1 text-sm font-medium">TradeOS Pro</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="glass-panel">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Notifications</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <button
                            onClick={() => setNotifications(n => !n)}
                            className={cn(
                                'flex w-full items-center justify-between rounded-xl border p-3 transition-all',
                                notifications ? 'border-profit/30 bg-profit/8' : 'border-white/10 bg-white/4'
                            )}
                        >
                            <div className="text-left">
                                <p className="text-sm font-medium">Enable notifications</p>
                                <p className="text-xs text-muted-foreground">Trade reminders and macro alerts</p>
                            </div>
                            <div className={cn(
                                'h-5 w-9 rounded-full transition-all',
                                notifications ? 'bg-profit' : 'bg-white/20'
                            )}>
                                <div className={cn(
                                    'mt-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                                    notifications ? 'translate-x-4' : 'translate-x-0.5'
                                )} />
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="min-w-32 gap-2">
                    {isSaving ? <><Spinner className="h-4 w-4" /> Saving…</> : 'Save Settings'}
                </Button>
            </div>
        </div>
    )
}
