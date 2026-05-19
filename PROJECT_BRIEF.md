# ICT Quarterly Cycles Dashboard — Project Brief

## Overview

An interactive local dashboard for analyzing historical ICT 90-minute cycles across NQ, ES, and YM futures. The user picks a cycle, sets bias/True-Open filters, and the app returns all historical days matching that setup — each viewable as a full 1-minute TradingView-style chart.

The logic is ported from a Pine Script indicator (`cd_Quarterly_cycles_SSMT_TPD_Cx_0902_2`); this dashboard reproduces the cycle, bias, and True Open calculations in Python.

---

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React (Vite) + TypeScript
- **Charting**: `lightweight-charts` by TradingView (free, matches TV look)
- **Database**: SQLite (single file, simple, fast enough for this scale)
- **Data processing**: pandas, numpy
- **Dev**: run locally — backend on `:8000`, frontend on `:5173`

Why these: FastAPI gives a typed API surface and async support; React with lightweight-charts gives the TradingView feel the user wants; SQLite avoids any setup friction.

---

## Data

### Input

CSVs in `/data/raw/`: `NQ_1m.csv`, `ES_1m.csv`, `YM_1m.csv`

Schema (after volume column dropped):
```
timestamp, open, high, low, close
```

- Timezone: **CST (America/Chicago)** — all timestamps interpreted as CST
- Trading day starts at **17:00 CST** (so a "day" = 17:00 today → 16:59:59 tomorrow)
- 1-minute resolution

### Derived (precomputed into SQLite)

A `cycles` table holds one row per 90m cycle per asset per day. For each cycle we precompute:

- Cycle metadata: date, asset, cycle_id (1-16), session (Asia/London/NY/PM), phase (A/M/D/X)
- OHLC of the cycle
- **Cycle bias** (Standard: HH+HL=Bullish, LH+LL=Bearish, else No Bias) — computed from the 2 prior 90m cycles
- **Daily bias** for the trading day containing this cycle — computed from 2 prior days
- **True Open positions** at cycle start: above/below for W-TO, D-TO, S-TO
- Outcome data: full-day high, low, close, daily range, day-direction (close vs day-open)

A `days` table for fast day-level lookups and chart rendering caches.

---

## 90-Minute Cycles (Strict ICT, 17:00 CST start)

All 16 cycles per day:

| # | Session | Phase | Start (CST) |
|---|---------|-------|-------------|
| 1 | Asia | A | 17:00 |
| 2 | Asia | M | 18:30 |
| 3 | Asia | D | 20:00 |
| 4 | Asia | X | 21:30 |
| 5 | London | A | 23:00 |
| 6 | London | M | 00:30 |
| 7 | London | D | 02:00 |
| 8 | London | X | 03:30 |
| 9 | NY | A | 05:00 |
| 10 | NY | M | 06:30 |
| 11 | NY | D | 08:00 |
| 12 | NY | X | 09:30 |
| 13 | PM | A | 11:00 |
| 14 | PM | M | 12:30 |
| 15 | PM | D | 14:00 |
| 16 | PM | X | 15:30 |

---

## True Opens

Mirroring the Pine Script:

- **True Week Open (W-TO)**: Open of cycle starting Monday 18:30 CST (the M-phase of the Asia session on the first day of the week)
- **True Day Open (D-TO)**: Open of cycle 2 of each trading day (18:30 CST — Asia M phase)
- **True Session Open (S-TO)**: Open of the M-phase 90m cycle within the current session (so 18:30/00:30/06:30/12:30 depending on session)

For each cycle, we record price position vs each True Open: `above` if `cycle_open > true_open`, else `below`.

---

## Bias Logic (Standard, Option 2)

Computed at the start of each cycle using the **two prior completed cycles** (no in-progress data):

```
Let H1, L1 = high/low of last completed cycle
Let H2, L2 = high/low of cycle before that
Let C1     = close of last completed cycle

if C1 > H2:                       Bullish   (broke above prior high)
elif C1 < L2:                     Bearish   (broke below prior low)
elif H1 > H2 and L1 > L2:         Bullish   (HH + HL)
elif H1 < H2 and L1 < L2:         Bearish   (LH + LL)
else:                             No Bias
```

The **same rules apply at the daily timeframe** — substituting "day" for "cycle" and using the 2 prior trading days.

---

## UI Design

### Layout (single page)

```
┌─────────────────────────────────────────────────────────┐
│  ICT Cycle Matcher                       [Asset: NQ ▼]  │
├─────────────────────────────────────────────────────────┤
│  FILTERS                                                │
│                                                         │
│  90m Cycle: [Dropdown: 17:00 Asia A ▼ ... 15:30 PM X]   │
│                                                         │
│  Filter mode: ( ) AND  ( ) OR  ( ) Single              │
│                                                         │
│  Cycle Bias:  [Bullish ▼] [Bearish ▼] [No Bias ▼] [Any] │
│  Daily Bias:  [Bullish ▼] [Bearish ▼] [No Bias ▼] [Any] │
│                                                         │
│  vs W-TO:  ( ) Above  ( ) Below  ( ) Any               │
│  vs D-TO:  ( ) Above  ( ) Below  ( ) Any               │
│  vs S-TO:  ( ) Above  ( ) Below  ( ) Any               │
│                                                         │
│  Date range: [____] to [____]                          │
├─────────────────────────────────────────────────────────┤
│  RESULTS — 47 matches                                   │
│                                                         │
│  Date       | C.Bias | D.Bias | W/D/S-TO | Day Outcome  │
│  2024-03-15 | Bull   | Bull   | A/A/A    | +1.2% close  │
│  2024-03-22 | Bull   | Bull   | A/A/B    | -0.4% close  │
│  ...                                                    │
│  [click row → opens chart modal]                       │
├─────────────────────────────────────────────────────────┤
│  CHART MODAL (when row clicked)                         │
│  Full-day 1m candles with:                              │
│  - 16 cycle boxes (color-coded by phase A/M/D/X)        │
│  - W-TO / D-TO / S-TO horizontal lines                  │
│  - Selected cycle highlighted                           │
│  - Toggle switches: cycles on/off, opens on/off         │
└─────────────────────────────────────────────────────────┘
```

### User flow

1. Pick asset (NQ/ES/YM)
2. Pick a 90m cycle (e.g., "08:00 NY D")
3. Set filters — bias of cycle, bias of day, position vs each True Open
4. AND/OR toggle controls whether cycle bias and daily bias must both match or either
5. Results table updates live (no submit button needed; debounce inputs)
6. Click any row → modal opens with full-day chart, that cycle highlighted

---

## API Endpoints (FastAPI)

```
GET  /api/assets                    → ["NQ", "ES", "YM"]
GET  /api/cycles                    → list of 16 cycle definitions
POST /api/search                    → main filter endpoint
     body: { asset, cycle_id, cycle_bias?, daily_bias?, w_to?, d_to?, s_to?,
             bias_logic: "and"|"or"|"single", date_from?, date_to? }
     returns: [{ date, cycle_bias, daily_bias, w_to_pos, d_to_pos, s_to_pos,
                 day_open, day_close, day_high, day_low, day_pct }]
GET  /api/day/{asset}/{date}        → 1m OHLC for that day + cycle boundaries + true opens
GET  /api/stats                     → summary counts by bias combo (optional, for sanity)
```

---

## Project Structure

```
ict_dashboard/
├── PROJECT_BRIEF.md          ← this file
├── PROJECT_STATUS.md         ← session log (update every work session)
├── README.md                 ← how to run
├── data/
│   ├── raw/                  ← user drops NQ_1m.csv, ES_1m.csv, YM_1m.csv here
│   └── ict_cycles.db         ← generated SQLite database
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py           ← FastAPI app
│   │   ├── api/              ← route handlers
│   │   ├── core/             ← cycle, bias, true-open logic
│   │   ├── db/               ← SQLAlchemy models + queries
│   │   └── scripts/
│   │       └── build_db.py   ← one-time precompute from CSVs
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── FilterPanel.tsx
        │   ├── ResultsTable.tsx
        │   └── DayChartModal.tsx
        └── api/client.ts
```

---

## Build Phases

### Phase 1 — Data layer (no UI)
1. CSV loader (handles CST tz, drops volume)
2. Cycle assignment per row (which of the 16 cycles each 1m candle belongs to)
3. Bias calculator (cycle-level and daily)
4. True Open calculator (W/D/S)
5. SQLite schema + `build_db.py` script
6. Validate against a few hand-checked days

### Phase 2 — Backend API
1. FastAPI scaffold, CORS for `:5173`
2. `/api/search` with all filters
3. `/api/day/{asset}/{date}` returning candle data + overlays
4. Test with curl/HTTPie

### Phase 3 — Frontend
1. Vite + React + TS scaffold
2. FilterPanel with all controls + debouncing
3. ResultsTable (virtualize if >500 rows)
4. DayChartModal with lightweight-charts
5. Cycle boxes + True Open lines + selected cycle highlight

### Phase 4 — Polish
1. Loading states, empty states, error handling
2. Persist last-used filters in localStorage
3. Export results to CSV button
4. README with run instructions

---

## Definition of Done

- User can pick asset, cycle, biases, True Open positions
- Filtering returns matching historical days within ~200ms (for ~3 years of data, in-memory + indexed SQLite handles this easily)
- Clicking any matched day opens a full-day 1m chart with cycle boxes + True Open lines
- Selected cycle is visually highlighted in the chart
- README explains how to: drop CSVs in, build the DB, run backend, run frontend

---

## Notes & Decisions Log

- **Bias = Standard rules** (not the unusual Pine HH/HL=Bearish rule). Confirmed.
- **All 16 cycles** including Asia and PM sessions.
- **2-bucket True Open** filter (Above / Below only).
- **One asset at a time** in UI — multi-asset cross-matching is a future enhancement.
- **Day outcome** in results = full-day close vs day-open (not next-cycle direction).
- **AND/OR toggle** for combining cycle bias + daily bias filters.

---

## Open Questions for Future

- Should the SSMT pair-comparison logic from the Pine be added? (Not in scope for v1.)
- Add NWOG/NDOG overlays to the chart? (Not in v1 unless requested.)
- Multi-asset correlated-setup filter? (Future v2.)
