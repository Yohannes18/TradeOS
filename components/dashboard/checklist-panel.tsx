'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle, RotateCcw, TrendingUp, Target, Droplets, GitBranch, Scale } from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
  weight: number
}

const checklistItems: ChecklistItem[] = [
  { id: 'trend', label: 'HTF Trend', description: 'Higher timeframe trend supports your trade direction', icon: TrendingUp, weight: 2 },
  { id: 'zone', label: 'Zone Quality', description: 'Entry zone has clean reaction and clear context', icon: Target, weight: 3 },
  { id: 'liquidity', label: 'Liquidity Sweep', description: 'Valid liquidity event confirms market intent', icon: Droplets, weight: 1 },
  { id: 'structure', label: 'Structure Break', description: 'Break of structure validates execution trigger', icon: GitBranch, weight: 2 },
  { id: 'rr', label: 'RR Valid', description: 'Risk/reward setup is acceptable', icon: Scale, weight: 2 },
]

interface ChecklistPanelProps {
  userId: string
  onScoreChange?: (score: number) => void
  onDecisionChange?: (decision: 'VALID' | 'RISKY' | 'NO TRADE') => void
}

export function ChecklistPanel({ userId, onScoreChange, onDecisionChange }: ChecklistPanelProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const maxScore = checklistItems.reduce((acc, item) => acc + item.weight, 0)

  const totalScore = (() => {
    const baseScore = checklistItems.reduce((acc, item) => {
      return acc + (checkedItems[item.id] ? item.weight : 0)
    }, 0)

    let finalScore = baseScore

    if (!checkedItems.trend && checkedItems.structure) {
      finalScore -= 2
    }

    if (!checkedItems.rr) {
      finalScore = 0
    }

    return Math.max(0, Math.min(maxScore, finalScore))
  })()

  const decision: 'VALID' | 'RISKY' | 'NO TRADE' =
    totalScore >= 8 ? 'VALID' : totalScore >= 5 ? 'RISKY' : 'NO TRADE'

  const handleCheckChange = (id: string, checked: boolean) => {
    const newChecked = { ...checkedItems, [id]: checked }
    setCheckedItems(newChecked)

    const baseScore = checklistItems.reduce((acc, item) => {
      return acc + (newChecked[item.id] ? item.weight : 0)
    }, 0)

    let newScore = baseScore

    if (!newChecked.trend && newChecked.structure) {
      newScore -= 2
    }

    if (!newChecked.rr) {
      newScore = 0
    }

    newScore = Math.max(0, Math.min(maxScore, newScore))
    const newDecision: 'VALID' | 'RISKY' | 'NO TRADE' =
      newScore >= 8 ? 'VALID' : newScore >= 5 ? 'RISKY' : 'NO TRADE'

    onScoreChange?.(newScore)
    onDecisionChange?.(newDecision)
  }

  const handleReset = () => {
    setCheckedItems({})
    onScoreChange?.(0)
    onDecisionChange?.('NO TRADE')
  }

  const handleSave = async () => {
    setIsSaving(true)
    await supabase.from('checklist_logs').insert({
      user_id: userId,
      trend: checkedItems.trend || false,
      zone: checkedItems.zone || false,
      liquidity: checkedItems.liquidity || false,
      structure: checkedItems.structure || false,
      rr: checkedItems.rr || false,
      total_score: totalScore,
    })
    setIsSaving(false)
    handleReset()
  }

  const getScoreColor = () => {
    const percentage = (totalScore / maxScore) * 100
    if (percentage >= 80) return 'text-profit'
    if (percentage >= 60) return 'text-chart-4'
    if (percentage >= 40) return 'text-muted-foreground'
    return 'text-loss'
  }

  const getScoreLabel = () => {
    return decision
  }

  return (
    <Card className="h-full flex flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">Pre-Trade Checklist</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex-1 flex flex-col gap-2">
          {checklistItems.map((item) => {
            const Icon = item.icon
            const isChecked = checkedItems[item.id] || false
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                  isChecked
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-secondary/30 hover:bg-secondary/50'
                )}
                onClick={() => handleCheckChange(item.id, !isChecked)}
              >
                <Checkbox
                  id={item.id}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheckChange(item.id, checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', isChecked ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', isChecked ? 'text-foreground' : 'text-muted-foreground')}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Trade Score</p>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-3xl font-bold', getScoreColor())}>{totalScore}</span>
                <span className="text-muted-foreground">/ {maxScore}</span>
              </div>
            </div>
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', {
              'bg-profit/10 text-profit': decision === 'VALID',
              'bg-chart-4/10 text-chart-4': decision === 'RISKY',
              'bg-loss/10 text-loss': decision === 'NO TRADE',
            })}>
              <CheckCircle className="h-3.5 w-3.5" />
              {getScoreLabel()}
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={totalScore === 0 || isSaving}
            className="w-full"
          >
            Log Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
