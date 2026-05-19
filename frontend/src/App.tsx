import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CycleDef, SearchResult, SearchParams, fetchCycles, searchCycles } from './api/client'
import FilterPanel from './components/FilterPanel'
import ResultsTable from './components/ResultsTable'
import DayChartModal from './components/DayChartModal'

export default function App() {
  const [cycles, setCycles] = useState<CycleDef[]>([])
  const [asset, setAsset] = useState('NQ')
  const [cycleId, setCycleId] = useState(11)
  const [cycleBias, setCycleBias] = useState('')
  const [dailyBias, setDailyBias] = useState('')
  const [biasLogic, setBiasLogic] = useState('and')
  const [wTo, setWTo] = useState('')
  const [dTo, setDTo] = useState('')
  const [sTo, setSTo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { fetchCycles().then(setCycles) }, [])

  const doSearch = useCallback(() => {
    if (!cycleId) return
    setLoading(true)
    const params: SearchParams = { asset, cycle_id: cycleId, bias_logic: biasLogic }
    if (cycleBias) params.cycle_bias = cycleBias
    if (dailyBias) params.daily_bias = dailyBias
    if (wTo) params.w_to = wTo
    if (dTo) params.d_to = dTo
    if (sTo) params.s_to = sTo
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    searchCycles(params).then(r => { setResults(r); setLoading(false) })
  }, [asset, cycleId, cycleBias, dailyBias, biasLogic, wTo, dTo, sTo, dateFrom, dateTo])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(doSearch, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [doSearch])

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>ICT Cycle Matcher</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>Asset:</span>
          {['NQ', 'ES', 'YM'].map(a => (
            <button key={a} onClick={() => setAsset(a)}
              style={{ background: a === asset ? 'var(--accent)' : 'var(--bg3)', color: a === asset ? '#fff' : 'var(--text)', border: 'none', padding: '5px 14px', borderRadius: 4, fontWeight: 600 }}>
              {a}
            </button>
          ))}
        </div>
      </header>

      <FilterPanel
        cycles={cycles} cycleId={cycleId} setCycleId={setCycleId}
        cycleBias={cycleBias} setCycleBias={setCycleBias}
        dailyBias={dailyBias} setDailyBias={setDailyBias}
        biasLogic={biasLogic} setBiasLogic={setBiasLogic}
        wTo={wTo} setWTo={setWTo} dTo={dTo} setDTo={setDTo} sTo={sTo} setSTo={setSTo}
        dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
      />

      <div style={{ margin: '12px 0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>
          {loading ? 'Searching...' : `${results.length} matches`}
        </span>
        {results.length > 0 && (
          <button onClick={() => {
            const hdr = 'Date,Cycle Bias,Daily Bias,W-TO,D-TO,S-TO,Day %,Direction\n'
            const csv = results.map(r => `${r.trading_date},${r.cycle_bias},${r.daily_bias},${r.w_to_pos||''},${r.d_to_pos||''},${r.s_to_pos||''},${r.day_pct},${r.day_direction}`).join('\n')
            const blob = new Blob([hdr + csv], { type: 'text/csv' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ict_results.csv'; a.click()
          }} style={{ fontSize: 12, padding: '4px 10px' }}>Export CSV</button>
        )}
      </div>

      <ResultsTable results={results} onRowClick={setSelectedDate} />

      {selectedDate && (
        <DayChartModal asset={asset} date={selectedDate} highlightCycleId={cycleId}
          onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}
