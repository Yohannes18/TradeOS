import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JournalPanel } from '@/components/dashboard/journal-panel'
import { getAuthenticatedUser } from '@/lib/auth/server-user'

export default async function JournalPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/auth/login')
    }

    const supabase = await createClient()

    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

    return (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
            <JournalPanel userId={user.id} initialTrades={trades || []} />
        </div>
    )
}
