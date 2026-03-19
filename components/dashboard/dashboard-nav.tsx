'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  LayoutDashboard,
  BookOpen,
  Settings,
  LogOut,
  User as UserIcon,
  CandlestickChart,
  BarChart3,
  CalendarDays,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardNavProps {
  user: User
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: CandlestickChart },
  { href: '/dashboard/journal', label: 'Journal', icon: BookOpen },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/community', label: 'Community', icon: Users, disabled: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen hidden md:flex flex-col">
      <div className="h-14 px-4 border-b border-border flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">TradeOS</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const itemClass = cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
            item.disabled && 'opacity-50 pointer-events-none',
          )

          if (item.disabled) {
            return (
              <div key={item.href} className={itemClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            )
          }

          return (
            <Link key={item.href} href={item.href} className={itemClass}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          <span className="truncate">{user.email}</span>
        </div>
        <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2 text-loss">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
