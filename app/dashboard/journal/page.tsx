import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JournalContent } from '@/components/journal/journal-content'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch trades with pagination
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <JournalContent userId={user.id} initialTrades={trades || []} />
}
