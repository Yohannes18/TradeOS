import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export default async function TradePage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return (
        <DashboardContent
            userId={user.id}
            settings={settings || { risk_percent: 1, account_balance: 10000 }}
        />
    )
}
