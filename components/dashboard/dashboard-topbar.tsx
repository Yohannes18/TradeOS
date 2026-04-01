'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { UserCircle2, Bell } from 'lucide-react'
import { QuickAddTrade } from '@/components/dashboard/quick-add-trade'

interface DashboardTopbarProps {
    email?: string | null
    userId?: string
    accountBalance?: number
    riskPercent?: number
}

export function DashboardTopbar({ email, userId, accountBalance = 10000, riskPercent = 1 }: DashboardTopbarProps) {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

    return (
        <header className="sticky top-0 z-20 border-b border-white/8 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">TradeOS Pro</p>
                    <p className="text-sm font-semibold">Execution Workspace</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-40 border-white/10 bg-white/5"
                        aria-label="Global date picker"
                    />
                    {userId ? (
                        <QuickAddTrade
                            userId={userId}
                            accountBalance={accountBalance}
                            riskPercent={riskPercent}
                        />
                    ) : null}
                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-44 truncate">{email || 'Trader'}</span>
                    </div>
                </div>
            </div>
        </header>
    )
}
