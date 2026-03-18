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
  { id: 'trend', label: 'Trend Alignment', description: 'Price is moving with higher timeframe trend', icon: TrendingUp, weight: 2 },
  { id: 'zone', label: 'Key Zone', description: 'Trade is at significant support/resistance', icon: Target, weight: 2 },
  { id: 'liquidity', label: 'Liquidity Sweep', description: 'Recent liquidity grab or stop hunt observed', icon: Droplets, weight: 2 },
  { id: 'structure', label: 'Market Structure', description: 'Clear break of structure confirmed', icon: GitBranch, weight: 2 },
  { id: 'rr', label: 'Risk/Reward', description: 'Minimum 2:1 risk to reward ratio', icon: Scale, weight: 2 },
]

interface ChecklistPanelProps {
  userId: string
  onScoreChange?: (score: number) => void
}

export function ChecklistPanel({ userId, onScoreChange }: ChecklistPanelProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const totalScore = Object.entries(checkedItems).reduce((acc, [id, checked]) => {
    if (checked) {
      const item = checklistItems.find((i) => i.id === id)
      return acc + (item?.weight ?? 0)
    }
    return acc
  }, 0)

  const maxScore = checklistItems.reduce((acc, item) => acc + item.weight, 0)

  const handleCheckChange = (id: string, checked: boolean) => {
    const newChecked = { ...checkedItems, [id]: checked }
    setCheckedItems(newChecked)
    const newScore = Object.entries(newChecked).reduce((acc, [itemId, isChecked]) => {
      if (isChecked) {
        const item = checklistItems.find((i) => i.id === itemId)
        return acc + (item?.weight ?? 0)
      }
      return acc
    }, 0)
    onScoreChange?.(newScore)
  }

  const handleReset = () => {
    setCheckedItems({})
    onScoreChange?.(0)
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
    const percentage = (totalScore / maxScore) * 100
    if (percentage >= 80) return 'High Probability'
    if (percentage >= 60) return 'Moderate'
    if (percentage >= 40) return 'Low'
    return 'Avoid Trade'
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
              'bg-profit/10 text-profit': (totalScore / maxScore) >= 0.8,
              'bg-chart-4/10 text-chart-4': (totalScore / maxScore) >= 0.6 && (totalScore / maxScore) < 0.8,
              'bg-muted text-muted-foreground': (totalScore / maxScore) >= 0.4 && (totalScore / maxScore) < 0.6,
              'bg-loss/10 text-loss': (totalScore / maxScore) < 0.4,
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
