# PROJECT_STATUS.md

**Last updated:** Session 2 — all phases complete
**Current phase:** 4 — Polish (done)
**Next step:** Run and test locally

> Read this first when resuming work.

---

## Phase progress

### Phase 1 — Data layer
- [x] 1.1 CSV loader (CST tz, dayfirst parsing)
- [x] 1.2 Cycle assignment for each 1m bar (vectorized)
- [x] 1.3 Bias calculator (cycle + daily, vectorized)
- [x] 1.4 True Open calculator (W/D/S)
- [x] 1.5 SQLite schema (days + cycles tables)
- [x] 1.6 build_db.py precompute script
- [x] 1.7 Sanity-checked: NQ 70,937 cycles, ES 2,868, YM 71,178

### Phase 2 — Backend API
- [x] 2.1 FastAPI scaffold + CORS
- [x] 2.2 /api/assets, /api/cycles
- [x] 2.3 /api/search with all filters (bias logic AND/OR)
- [x] 2.4 /api/day/{asset}/{date} (candles from CSV cache)
- [x] 2.5 /api/stats

### Phase 3 — Frontend
- [x] 3.1 Vite + React + TS scaffold
- [x] 3.2 FilterPanel (cycle, biases, true opens, date range)
- [x] 3.3 ResultsTable (virtualized scrolling)
- [x] 3.4 DayChartModal with lightweight-charts
- [x] 3.5 Cycle markers + True Open price lines

### Phase 4 — Polish
- [x] 4.1 Loading states, empty states
- [x] 4.2 Debounced live search (300ms)
- [x] 4.3 CSV export button
- [x] 4.4 README finalized
- [ ] 4.5 localStorage filter persistence (TODO)

---

## Notes

- Candles NOT stored in SQLite (12M rows too large for sandbox build). Served from in-memory CSV cache at runtime — fast enough for single-day queries.
- SQLite has disk I/O issues on Windows mounted drives in sandbox. Works fine when run natively.
- Date format in CSVs is DD/MM/YYYY (dayfirst=True).
- Build script processes each asset separately (~30s each for NQ/YM).

---

## Session log

### Session 1 — Planning
- Spec finalized, PROJECT_BRIEF.md written

### Session 2 — Full build
- Built all 4 phases: data layer, API, frontend, polish
- Database: NQ 4,504 days / 70,937 cycles, YM 4,521 days / 71,178 cycles, ES 188 days / 2,868 cycles
- TypeScript compiles clean, FastAPI routes verified
- Data sanity-checked against recent NQ dates
