import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardNav user={user} />
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  )
}
