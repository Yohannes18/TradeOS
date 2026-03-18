'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Search, ExternalLink } from 'lucide-react'

const popularPairs = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD',
  'ETHUSD', 'SPX500', 'NAS100', 'GBPJPY', 'AUDUSD',
]

const timeframes = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
]

interface ChartPanelProps {
  onPairSelect?: (pair: string) => void
}

export function ChartPanel({ onPairSelect }: ChartPanelProps) {
  const [selectedPair, setSelectedPair] = useState('XAUUSD')
  const [timeframe, setTimeframe] = useState('60')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPairs = popularPairs.filter((pair) =>
    pair.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair)
    setSearchQuery('')
    onPairSelect?.(pair)
  }

  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${selectedPair}&interval=${timeframe}`

  return (
    <Card className="h-full flex flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {selectedPair}
            </CardTitle>
            <div className="flex items-center gap-1">
              {timeframes.slice(0, 5).map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setTimeframe(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-secondary border-border"
            />
            {searchQuery && filteredPairs.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                {filteredPairs.map((pair) => (
                  <button
                    key={pair}
                    onClick={() => handlePairSelect(pair)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                  >
                    {pair}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-secondary/20 border-t border-border">
          <div className="text-center p-6">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Chart View</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Open TradingView to analyze {selectedPair} with professional charting tools.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {popularPairs.slice(0, 5).map((pair) => (
                <Button
                  key={pair}
                  variant={selectedPair === pair ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePairSelect(pair)}
                >
                  {pair}
                </Button>
              ))}
            </div>
            <a href={tradingViewUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in TradingView
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
