import React, { useRef, useEffect, useState } from 'react'
import { SearchResult } from '../api/client'

interface Props {
  results: SearchResult[]
  onRowClick: (date: string) => void
}

const biasColor = (b: string) => b === 'Bullish' ? 'var(--green)' : b === 'Bearish' ? 'var(--red)' : 'var(--text2)'
const toStr = (v: string | null) => v === 'Above' ? 'A' : v === 'Below' ? 'B' : '-'

export default function ResultsTable({ results, onRowClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ROW_H = 32
  const HEADER_H = 34
  const [scrollTop, setScrollTop] = useState(0)
  const visibleCount = 20

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - 2)
  const endIdx = Math.min(results.length, startIdx + visibleCount + 4)
  const totalH = results.length * ROW_H

  return (
    <div ref={containerRef} onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ maxHeight: 600, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg3)', position: 'sticky', top: 0, zIndex: 1 }}>
            {['Date', 'C.Bias', 'D.Bias', 'W-TO', 'D-TO', 'S-TO', 'Day %', 'Dir', 'Range'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: 'var(--text2)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--text2)' }}>No matches</td></tr>
          ) : (
            <>
              {startIdx > 0 && <tr style={{ height: startIdx * ROW_H }}><td colSpan={9} /></tr>}
              {results.slice(startIdx, endIdx).map((r, i) => (
                <tr key={r.trading_date} onClick={() => onRowClick(r.trading_date)}
                  style={{ cursor: 'pointer', height: ROW_H, borderBottom: '1px solid var(--border)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0 10px', fontFamily: 'monospace' }}>{r.trading_date}</td>
                  <td style={{ padding: '0 10px', color: biasColor(r.cycle_bias) }}>{r.cycle_bias}</td>
                  <td style={{ padding: '0 10px', color: biasColor(r.daily_bias) }}>{r.daily_bias}</td>
                  <td style={{ padding: '0 10px', textAlign: 'center' }}>{toStr(r.w_to_pos)}</td>
                  <td style={{ padding: '0 10px', textAlign: 'center' }}>{toStr(r.d_to_pos)}</td>
                  <td style={{ padding: '0 10px', textAlign: 'center' }}>{toStr(r.s_to_pos)}</td>
                  <td style={{ padding: '0 10px', fontFamily: 'monospace', color: r.day_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.day_pct > 0 ? '+' : ''}{r.day_pct.toFixed(2)}%</td>
                  <td style={{ padding: '0 10px', color: r.day_direction === 'Up' ? 'var(--green)' : 'var(--red)' }}>{r.day_direction}</td>
                  <td style={{ padding: '0 10px', fontFamily: 'monospace' }}>{r.day_range.toFixed(2)}</td>
                </tr>
              ))}
              {endIdx < results.length && <tr style={{ height: (results.length - endIdx) * ROW_H }}><td colSpan={9} /></tr>}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
