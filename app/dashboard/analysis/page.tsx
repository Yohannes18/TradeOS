import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TradingAnalysisPanel } from '@/components/dashboard/trading-analysis-panel'

export default async function AnalysisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
      <TradingAnalysisPanel />
    </div>
  )
}
