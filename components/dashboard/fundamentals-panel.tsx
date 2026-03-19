'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, FileText, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AnalysisBias = 'bullish' | 'bearish' | 'neutral'

interface AutoAnalysisResult {
  recommendedBias: AnalysisBias
  confidence: number
  summary: string
  keyDrivers: string[]
  riskFlags: string[]
  providersUsed: string[]
}

interface FundamentalsPanelProps {
  pair?: string
  onBiasChange?: (bias: 'bullish' | 'bearish' | 'neutral') => void
  onNotesChange?: (notes: string) => void
}

export function FundamentalsPanel({ pair = 'XAUUSD', onBiasChange, onNotesChange }: FundamentalsPanelProps) {
  const [bias, setBias] = useState<AnalysisBias>('neutral')
  const [timeframe, setTimeframe] = useState<'scalp' | 'intraday' | 'swing' | 'position'>('intraday')
  const [notes, setNotes] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AutoAnalysisResult | null>(null)

  const handleBiasChange = (newBias: AnalysisBias) => {
    setBias(newBias)
    onBiasChange?.(newBias)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    onNotesChange?.(value)
  }

  const handleAutoAnalyze = async () => {
    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair,
          timeframe,
          notes,
          manualBias: bias,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data?.result) {
        throw new Error(data?.error || 'Unable to generate analysis.')
      }

      const result = data.result as AutoAnalysisResult
      setAnalysis(result)
      handleBiasChange(result.recommendedBias)

      const generatedNotes = [
        `Auto Analysis (${result.providersUsed.join(', ')}):`,
        result.summary,
        '',
        'Key Drivers:',
        ...result.keyDrivers.map((item) => `- ${item}`),
        '',
        'Risk Flags:',
        ...(result.riskFlags.length > 0
          ? result.riskFlags.map((item) => `- ${item}`)
          : ['- No major risk flags identified.']),
      ].join('\n')

      handleNotesChange(generatedNotes)
      toast.success('Auto analysis generated successfully.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run auto analysis.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Card className="h-full flex flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Trade Analysis
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoAnalyze}
            disabled={isAnalyzing}
            className="gap-1.5"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Auto Analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Market Bias for {pair}
          </label>
          <div className="flex gap-2">
            <Button
              variant={bias === 'bullish' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'flex-1 gap-1.5',
                bias === 'bullish' && 'bg-profit hover:bg-profit/90 text-white border-profit'
              )}
              onClick={() => handleBiasChange('bullish')}
            >
              <TrendingUp className="h-4 w-4" />
              Bullish
            </Button>
            <Button
              variant={bias === 'neutral' ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-1 gap-1.5', bias === 'neutral' && 'bg-muted')}
              onClick={() => handleBiasChange('neutral')}
            >
              <Minus className="h-4 w-4" />
              Neutral
            </Button>
            <Button
              variant={bias === 'bearish' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'flex-1 gap-1.5',
                bias === 'bearish' && 'bg-loss hover:bg-loss/90 text-white border-loss'
              )}
              onClick={() => handleBiasChange('bearish')}
            >
              <TrendingDown className="h-4 w-4" />
              Bearish
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Timeframe
          </label>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as typeof timeframe)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scalp">Scalp (M1-M15)</SelectItem>
              <SelectItem value="intraday">Intraday (M15-H4)</SelectItem>
              <SelectItem value="swing">Swing (H4-D1)</SelectItem>
              <SelectItem value="position">Position (D1-W1)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Trade Notes
          </label>
          <Textarea
            placeholder="Describe your analysis, key levels, news events, and reasoning for this trade..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="flex-1 min-h-[120px] resize-none bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {analysis && (
          <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Automated Signal</p>
              <span className="text-xs text-muted-foreground">
                Confidence: {analysis.confidence}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            <p className="text-xs text-muted-foreground">
              Providers: {analysis.providersUsed.join(', ')}
            </p>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Quick Reference</h4>
          <div className="flex flex-wrap gap-1.5">
            {['HTF Trend', 'LTF Entry', 'FVG', 'OB', 'BOS', 'CHoCH', 'EQH/EQL'].map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-md bg-secondary text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
