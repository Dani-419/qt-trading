# ICT Quarterly Cycles Dashboard

Interactive dashboard for analyzing historical ICT 90-minute cycles across NQ, ES, and YM futures.

## Quick Start

### 1. Data Setup

Place your 1-minute CSV files in `data/raw/`:
- `NQ_1m.csv`, `ES_1m.csv`, `YM_1m.csv`

CSVs are already symlinked from the root-level `*_bk.csv` files.

### 2. Build Database

```bash
cd backend
pip install -r requirements.txt
cd ..
python backend/app/scripts/build_db.py
```

This precomputes all cycles, biases, and true opens into `data/ict_cycles.db`.

### 3. Run Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Usage

1. Pick asset (NQ/ES/YM) from the header
2. Select a 90-minute cycle (e.g., "08:00 NY D")
3. Set filters: cycle bias, daily bias, true open positions
4. Results update live — click any row to see the full-day chart
5. Chart shows 1m candles with cycle labels and True Open price lines

## Architecture

- **Backend**: FastAPI + SQLite (precomputed cycles table, candles served from CSV cache)
- **Frontend**: React + TypeScript + lightweight-charts
- **Data flow**: CSVs → build_db.py → SQLite → FastAPI → React
