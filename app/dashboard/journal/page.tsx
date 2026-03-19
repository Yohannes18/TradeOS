import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JournalPanel } from '@/components/dashboard/journal-panel'

export default async function JournalPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

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
