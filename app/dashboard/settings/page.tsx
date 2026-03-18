import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from '@/components/settings/settings-content'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

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
