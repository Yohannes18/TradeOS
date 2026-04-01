import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('account_balance, risk_percent')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="app-shell flex">
      <DashboardNav user={user} />
      <main className="shell-surface relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(106,151,255,0.12),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(104,239,191,0.08),transparent_18%)]" />
        <div className="page-transition h-full min-h-screen overflow-auto">
          <DashboardTopbar
            email={user.email}
            userId={user.id}
            accountBalance={Number(settings?.account_balance || 10000)}
            riskPercent={Number(settings?.risk_percent || 1)}
          />
          {children}
        </div>
      </main>
    </div>
  )
}
