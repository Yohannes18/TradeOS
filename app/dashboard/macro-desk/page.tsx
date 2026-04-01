import { MacroDeskLive } from '@/components/dashboard/macro-desk-live'

export default function MacroDeskPage() {
    return (
        <div className="page-wrap overflow-auto pb-20">
            <header className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Macro Desk</p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Cross-Asset Terminal</h1>
                    </div>
                    <div className="rounded-full border border-profit/30 bg-profit/10 px-3 py-1 text-xs font-medium text-profit">
                        Live Feed
                    </div>
                </div>
            </header>
            <MacroDeskLive />
        </div>
    )
}
