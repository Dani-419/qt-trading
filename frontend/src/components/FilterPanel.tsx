import React from 'react'
import { CycleDef } from '../api/client'

interface Props {
  cycles: CycleDef[]; cycleId: number; setCycleId: (v: number) => void
  cycleBias: string; setCycleBias: (v: string) => void
  dailyBias: string; setDailyBias: (v: string) => void
  biasLogic: string; setBiasLogic: (v: string) => void
  wTo: string; setWTo: (v: string) => void
  dTo: string; setDTo: (v: string) => void
  sTo: string; setSTo: (v: string) => void
  dateFrom: string; setDateFrom: (v: string) => void
  dateTo: string; setDateTo: (v: string) => void
}

const biasOpts = ['', 'Bullish', 'Bearish', 'No Bias']
const toOpts = ['', 'Above', 'Below']

function Lbl({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--text2)', fontSize: 12, minWidth: 55 }}>{children}</span>
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
}

export default function FilterPanel(p: Props) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px 24px' }}>
      <Row>
        <Lbl>Cycle</Lbl>
        <select value={p.cycleId} onChange={e => p.setCycleId(+e.target.value)} style={{ minWidth: 180 }}>
          {p.cycles.map(c => <option key={c.cycle_id} value={c.cycle_id}>{c.label}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>C.Bias</Lbl>
        <select value={p.cycleBias} onChange={e => p.setCycleBias(e.target.value)}>
          <option value="">Any</option>
          {biasOpts.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>D.Bias</Lbl>
        <select value={p.dailyBias} onChange={e => p.setDailyBias(e.target.value)}>
          <option value="">Any</option>
          {biasOpts.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>Logic</Lbl>
        {['and', 'or', 'single'].map(v => (
          <label key={v} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <input type="radio" name="logic" value={v} checked={p.biasLogic === v} onChange={() => p.setBiasLogic(v)} />
            {v.toUpperCase()}
          </label>
        ))}
      </Row>

      <Row>
        <Lbl>W-TO</Lbl>
        <select value={p.wTo} onChange={e => p.setWTo(e.target.value)}>
          <option value="">Any</option>
          {toOpts.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>D-TO</Lbl>
        <select value={p.dTo} onChange={e => p.setDTo(e.target.value)}>
          <option value="">Any</option>
          {toOpts.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>S-TO</Lbl>
        <select value={p.sTo} onChange={e => p.setSTo(e.target.value)}>
          <option value="">Any</option>
          {toOpts.filter(Boolean).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </Row>

      <Row>
        <Lbl>From</Lbl>
        <input type="date" value={p.dateFrom} onChange={e => p.setDateFrom(e.target.value)} />
      </Row>

      <Row>
        <Lbl>To</Lbl>
        <input type="date" value={p.dateTo} onChange={e => p.setDateTo(e.target.value)} />
      </Row>
    </div>
  )
}
