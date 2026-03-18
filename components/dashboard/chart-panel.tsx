'use client'

import { memo, useEffect, useRef, useState } from 'react'
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
import { BarChart3, Search } from 'lucide-react'

const popularPairs = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD',
  'ETHUSD', 'SPX500', 'NAS100', 'GBPJPY', 'AUDUSD',
]

const symbolMap: Record<string, string> = {
  EURUSD: 'OANDA:EURUSD',
  GBPUSD: 'OANDA:GBPUSD',
  USDJPY: 'OANDA:USDJPY',
  XAUUSD: 'PEPPERSTONE:XAUUSD',
  BTCUSD: 'BITSTAMP:BTCUSD',
  ETHUSD: 'BITSTAMP:ETHUSD',
  SPX500: 'FOREXCOM:SPXUSD',
  NAS100: 'FOREXCOM:NSXUSD',
  GBPJPY: 'OANDA:GBPJPY',
  AUDUSD: 'OANDA:AUDUSD',
}

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

interface TradingViewWidgetProps {
  symbol: string
  interval: string
}

const TradingViewWidget = memo(function TradingViewWidget({
  symbol,
  interval,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.text = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: true,
      interval,
      locale: 'en',
      save_image: true,
      style: '1',
      symbol,
      theme: 'dark',
      timezone: 'Etc/UTC',
      backgroundColor: 'rgba(15, 15, 15, 1)',
      gridColor: 'rgba(242, 242, 242, 0.06)',
      watchlist: [
        'OANDA:XAUUSD',
        'IG:NASDAQ',
        'OANDA:EURUSD',
        'OANDA:GBPUSD',
        'OANDA:USDJPY',
      ],
      withdateranges: true,
      range: 'YTD',
      compareSymbols: [
        {
          symbol: 'TVC:DXY',
          position: 'SameScale',
        },
      ],
      studies: [
        'STD;Accumulation_Distribution',
        'STD;Trading%1Sessions',
        'STD;Historical_Volatility',
        'STD;Price%1Target',
        'STD;Price_Momentum_Oscillator',
      ],
      autosize: true,
    })

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = 'calc(100% - 32px)'
    widgetContainer.style.width = '100%'

    const copyright = document.createElement('div')
    copyright.className = 'tradingview-widget-copyright text-xs text-muted-foreground'
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" class="text-primary hover:underline">Chart by TradingView</a>'

    containerRef.current.appendChild(widgetContainer)
    containerRef.current.appendChild(copyright)
    containerRef.current.appendChild(script)
  }, [symbol, interval])

  return (
    <div
      className="tradingview-widget-container h-full w-full"
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  )
})

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

  const tradingViewSymbol = symbolMap[selectedPair] || `OANDA:${selectedPair}`

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
        <div className="h-full min-h-[300px] border-t border-border bg-secondary/20 p-2">
          <TradingViewWidget symbol={tradingViewSymbol} interval={timeframe} />
        </div>
      </CardContent>
    </Card>
  )
}
