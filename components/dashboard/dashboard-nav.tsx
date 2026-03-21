'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
  Sparkles,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { betterAuthClient, isBetterAuthClientEnabled } from '@/lib/auth/better-auth-client'

interface DashboardNavProps {
  user: {
    email?: string | null
  }
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    if (isBetterAuthClientEnabled) {
      await betterAuthClient.signOut()
    } else {
      await supabase.auth.signOut()
    }
    setMobileOpen(false)
    router.push('/auth/login')
    router.refresh()
  }

  const renderNavItems = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const isActive = pathname === item.href
      const itemClass = cn(
        'nav-link',
        isActive && 'nav-link-active',
        item.disabled && 'pointer-events-none opacity-50',
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
        <Link key={item.href} href={item.href} className={itemClass} onClick={onNavigate}>
          <item.icon className="h-4 w-4" />
          <span className="pl-2">{item.label}</span>
        </Link>
      )
    })

  return (
    <>
      <div className="mobile-topbar md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_30px_rgba(90,135,255,0.34)]">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">TradeOS</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Trader Workspace</p>
            </div>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-white/10 bg-white/4">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] border-white/8 bg-sidebar/96 p-0 text-foreground backdrop-blur-2xl sm:max-w-sm">
              <SheetHeader className="border-b border-white/8 px-5 py-5">
                <SheetTitle className="flex items-center gap-3 text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_30px_rgba(90,135,255,0.34)]">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-foreground">TradeOS</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Trader Workspace</p>
                  </div>
                </SheetTitle>
                <SheetDescription className="text-left leading-6">
                  Cleaner execution, tighter journaling, and a calmer dashboard built for disciplined decisions.
                </SheetDescription>
              </SheetHeader>

              <div className="flex h-full flex-col px-4 py-4">
                <div className="mb-4 rounded-[24px] border border-white/8 bg-white/4 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Focus Mode
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Stay in rhythm across checklist, execution, journal, and review.
                  </p>
                </div>

                <nav className="flex-1 space-y-1 rounded-[24px] border border-white/8 bg-white/3 p-3">
                  {renderNavItems(() => setMobileOpen(false))}
                </nav>

                <div className="mt-4 rounded-[24px] border border-white/8 bg-white/4 p-3 shadow-[0_18px_40px_rgba(4,10,26,0.22)]">
                  <div className="flex items-center gap-3 rounded-2xl bg-black/10 px-3 py-3 text-sm text-muted-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signed in</p>
                      <span className="block truncate text-sm text-foreground">{user.email}</span>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={handleSignOut} className="mt-2 w-full justify-start gap-2 text-loss hover:bg-loss/10 hover:text-loss">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <aside className="hidden min-h-screen w-72 flex-col border-r border-white/8 bg-sidebar/70 px-4 py-5 backdrop-blur-2xl md:flex">
        <div className="rounded-[28px] border border-white/8 bg-white/4 p-4 shadow-[0_24px_60px_rgba(4,10,26,0.34)]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-[0_14px_30px_rgba(90,135,255,0.34)]">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">TradeOS</p>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Trader Workspace</p>
            </div>
          </Link>
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Focus Mode
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Cleaner execution, tighter journaling, and a calmer dashboard built for disciplined decisions.
            </p>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 rounded-[28px] border border-white/8 bg-white/3 p-3">
          {renderNavItems()}
        </nav>

        <div className="mt-5 rounded-[28px] border border-white/8 bg-white/4 p-3 shadow-[0_18px_40px_rgba(4,10,26,0.22)]">
          <div className="flex items-center gap-3 rounded-2xl bg-black/10 px-3 py-3 text-sm text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signed in</p>
              <span className="block truncate text-sm text-foreground">{user.email}</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="mt-2 w-full justify-start gap-2 text-loss hover:bg-loss/10 hover:text-loss">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
