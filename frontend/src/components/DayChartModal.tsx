import React, { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { DayData, CycleInfo, fetchDay } from '../api/client'

interface Props {
  asset: string; date: string; highlightCycleId: number
  onClose: () => void
}

const CYCLE_COLORS: Record<string, string> = {
  A: 'rgba(74, 144, 217, 0.08)',
  M: 'rgba(38, 166, 154, 0.08)',
  D: 'rgba(239, 83, 80, 0.08)',
  X: 'rgba(255, 167, 38, 0.08)',
}
const HIGHLIGHT_COLORS: Record<string, string> = {
  A: 'rgba(74, 144, 217, 0.22)',
  M: 'rgba(38, 166, 154, 0.22)',
  D: 'rgba(239, 83, 80, 0.22)',
  X: 'rgba(255, 167, 38, 0.22)',
}

export default function DayChartModal({ asset, date, highlightCycleId, onClose }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCycles, setShowCycles] = useState(true)
  const [showOpens, setShowOpens] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchDay(asset, date).then(d => { setData(d); setLoading(false) })
  }, [asset, date])

  useEffect(() => {
    if (!data || !chartContainerRef.current) return
    const container = chartContainerRef.current
    container.innerHTML = ''

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: { background: { color: '#0a0a0f' }, textColor: '#8888a0' },
      grid: { vertLines: { color: '#1a1a26' }, horzLines: { color: '#1a1a26' } },
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true, secondsVisible: false },
    })
    chartRef.current = chart

    // Candle series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })

    const candles: CandlestickData[] = data.candles.map(c => ({
      time: (new Date(c.timestamp).getTime() / 1000) as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }))
    candleSeries.setData(candles)

    // Cycle background markers using box annotations via markers
    if (showCycles && data.cycles.length > 0) {
      // Find cycle time boundaries from candle data
      const cycleGroups: Record<number, { start: number; end: number; phase: string }> = {}
      data.candles.forEach(c => {
        const t = new Date(c.timestamp).getTime() / 1000
        if (!cycleGroups[c.cycle_id]) {
          const ci = data.cycles.find(x => x.cycle_id === c.cycle_id)
          cycleGroups[c.cycle_id] = { start: t, end: t, phase: ci?.phase || 'A' }
        }
        cycleGroups[c.cycle_id].end = t
      })

      // Use markers for cycle labels
      const markers = Object.entries(cycleGroups).map(([id, g]) => {
        const isHighlight = +id === highlightCycleId
        const ci = data.cycles.find(x => x.cycle_id === +id)
        return {
          time: (g.start + 30 * 60) as Time, // offset slightly into cycle
          position: 'aboveBar' as const,
          shape: 'square' as const,
          color: isHighlight ? '#ffa726' : 'rgba(136,136,160,0.3)',
          text: `C${id} ${ci?.phase || ''}`,
          size: 0.1,
        }
      })
      candleSeries.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)))
    }

    // True Open lines
    if (showOpens && data.cycles.length > 0) {
      const c1 = data.cycles[0]
      const lines: { price: number; color: string; title: string }[] = []
      if (c1.w_to_price) lines.push({ price: c1.w_to_price, color: '#ffa726', title: 'W-TO' })
      if (c1.d_to_price) lines.push({ price: c1.d_to_price, color: '#4a90d9', title: 'D-TO' })
      if (c1.s_to_price) lines.push({ price: c1.s_to_price, color: '#ab47bc', title: 'S-TO' })
      lines.forEach(l => {
        candleSeries.createPriceLine({
          price: l.price,
          color: l.color,
          lineWidth: 1,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: l.title,
        })
      })
    }

    chart.timeScale().fitContent()

    const handleResize = () => chart.applyOptions({ width: container.clientWidth })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, showCycles, showOpens, highlightCycleId])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, width: '95vw', maxWidth: 1200, maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{asset} — {date}</h2>
            {data?.day && (
              <span style={{ fontSize: 13, color: data.day.day_direction === 'Up' ? 'var(--green)' : 'var(--red)' }}>
                {data.day.day_direction} {((data.day.day_close - data.day.day_open) / data.day.day_open * 100).toFixed(2)}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={showCycles} onChange={() => setShowCycles(!showCycles)} /> Cycles
            </label>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={showOpens} onChange={() => setShowOpens(!showOpens)} /> True Opens
            </label>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, padding: '0 4px' }}>&times;</button>
          </div>
        </div>

        {/* Cycle info bar */}
        {data?.cycles && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
            {data.cycles.map(c => (
              <div key={c.cycle_id} style={{
                padding: '3px 8px', borderRadius: 3, fontSize: 11, whiteSpace: 'nowrap',
                background: c.cycle_id === highlightCycleId ? 'var(--accent)' : 'var(--bg3)',
                color: c.cycle_id === highlightCycleId ? '#fff' : 'var(--text2)',
                fontWeight: c.cycle_id === highlightCycleId ? 600 : 400,
              }}>
                C{c.cycle_id} {c.session[0]}{c.phase}
                <span style={{ marginLeft: 4, color: c.cycle_bias === 'Bullish' ? 'var(--green)' : c.cycle_bias === 'Bearish' ? 'var(--red)' : 'inherit' }}>
                  {c.cycle_bias === 'Bullish' ? '▲' : c.cycle_bias === 'Bearish' ? '▼' : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ padding: '8px 16px 16px' }}>
          {loading ? (
            <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading chart...</div>
          ) : (
            <div ref={chartContainerRef} />
          )}
        </div>
      </div>
    </div>
  )
}
