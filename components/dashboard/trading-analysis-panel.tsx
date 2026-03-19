'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, BrainCircuit, CalendarDays, CalendarRange, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface MacroBrief {
    generatedAt: string
    sources: string[]
    daily: string[]
    weekly: string[]
    monthly: string[]
    strategy: string[]
    keyLevels: string[]
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'all'

export function TradingAnalysisPanel() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<MacroBrief | null>(null)
    const [view, setView] = useState<ViewMode>('all')

    const fetchMacroBrief = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/macro-brief', { cache: 'no-store' })
            const payload = await response.json()

            if (!response.ok || !payload?.result) {
                throw new Error(payload?.error || 'Could not load trading analysis.')
            }

            setData(payload.result as MacroBrief)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load trading analysis.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMacroBrief()
    }, [])

    const sections = useMemo(() => {
        if (!data) return [] as Array<{ key: string; title: string; items: string[]; icon: React.ReactNode }>

        const mapped = [
            { key: 'daily', title: 'Daily Macro Trend', items: data.daily, icon: <Calendar className="h-4 w-4" /> },
            { key: 'weekly', title: 'Weekly Macro Trend', items: data.weekly, icon: <CalendarDays className="h-4 w-4" /> },
            { key: 'monthly', title: 'Monthly Macro Trend', items: data.monthly, icon: <CalendarRange className="h-4 w-4" /> },
            { key: 'strategy', title: 'Strategic AI Thinking', items: data.strategy, icon: <BrainCircuit className="h-4 w-4" /> },
            { key: 'levels', title: 'Key Levels & News', items: data.keyLevels, icon: <RefreshCw className="h-4 w-4" /> },
        ]

        if (view === 'all') return mapped
        if (view === 'daily') return mapped.filter((item) => item.key === 'daily' || item.key === 'strategy' || item.key === 'levels')
        if (view === 'weekly') return mapped.filter((item) => item.key === 'weekly' || item.key === 'strategy' || item.key === 'levels')
        return mapped.filter((item) => item.key === 'monthly' || item.key === 'strategy' || item.key === 'levels')
    }, [data, view])

    return (
        <div className="h-full flex flex-col gap-3">
            <Card className="border-border bg-card">
                <CardHeader className="pb-2 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-sm">Trading Analysis</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button variant={view === 'daily' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5" onClick={() => setView('daily')}>Daily</Button>
                            <Button variant={view === 'weekly' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5" onClick={() => setView('weekly')}>Weekly</Button>
                            <Button variant={view === 'monthly' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5" onClick={() => setView('monthly')}>Monthly</Button>
                            <Button variant={view === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5" onClick={() => setView('all')}>All</Button>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 gap-1" onClick={fetchMacroBrief} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh
                            </Button>
                        </div>
                    </div>
                    {data && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[11px]">Updated: {new Date(data.generatedAt).toLocaleString()}</Badge>
                            {data.sources.map((source) => (
                                <Badge key={source} variant="outline" className="text-[11px]">{source}</Badge>
                            ))}
                        </div>
                    )}
                </CardHeader>
            </Card>

            {loading && !data ? (
                <Card className="border-border bg-card flex-1">
                    <CardContent className="h-full flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Building macro brief...
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sections.map((section) => (
                        <Card key={section.key} className="border-border bg-card">
                            <CardHeader className="pb-1.5 pt-4">
                                <CardTitle className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
                                    {section.icon}
                                    {section.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                                <ul className="space-y-1.5">
                                    {section.items.map((item, index) => (
                                        <li key={`${section.key}-${index}`} className="text-xs text-muted-foreground leading-snug">
                                            • {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
