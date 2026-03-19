import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from '@/components/settings/settings-content'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export default async function SettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Fetch user settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <SettingsContent
      userId={user.id}
      userEmail={user.email || ''}
      settings={settings || { risk_percent: 1, account_balance: 10000 }}
    />
  )
}
