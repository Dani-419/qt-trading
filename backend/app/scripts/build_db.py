#!/usr/bin/env python3
"""
Build SQLite database from raw CSVs.
Precomputes cycles, biases, true opens, day summaries.
"""
import sqlite3, sys, time, shutil
from pathlib import Path
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.loader import load_csv
from backend.app.core.trading_day import assign_trading_day, assign_cycle
from backend.app.core.bias import compute_bias
from backend.app.core.cycles import CYCLES, SESSION_M_PHASE, CYCLE_BY_ID

DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
BUILD_PATH = Path("/tmp/ict_cycles.db")
DB_PATH = DATA_DIR / "ict_cycles.db"

ASSETS = {
    "NQ": RAW_DIR / "NQ_1m.csv",
    "ES": RAW_DIR / "ES_1m.csv",
    "YM": RAW_DIR / "YM_1m.csv",
}

def create_schema(conn):
    conn.executescript("""
        DROP TABLE IF EXISTS cycles;
        DROP TABLE IF EXISTS days;
        DROP TABLE IF EXISTS candles;
        CREATE TABLE days (
            asset TEXT NOT NULL, trading_date TEXT NOT NULL,
            day_open REAL, day_high REAL, day_low REAL, day_close REAL,
            day_range REAL, day_direction TEXT, weekday INTEGER,
            PRIMARY KEY (asset, trading_date)
        );
        CREATE TABLE cycles (
            asset TEXT NOT NULL, trading_date TEXT NOT NULL, cycle_id INTEGER NOT NULL,
            session TEXT, phase TEXT,
            cycle_open REAL, cycle_high REAL, cycle_low REAL, cycle_close REAL,
            cycle_bias TEXT, daily_bias TEXT,
            w_to_price REAL, d_to_price REAL, s_to_price REAL,
            w_to_pos TEXT, d_to_pos TEXT, s_to_pos TEXT,
            day_open REAL, day_high REAL, day_low REAL, day_close REAL,
            day_range REAL, day_pct REAL, day_direction TEXT,
            PRIMARY KEY (asset, trading_date, cycle_id)
        );
        CREATE TABLE candles (
            asset TEXT NOT NULL, trading_date TEXT NOT NULL, timestamp TEXT NOT NULL,
            open REAL, high REAL, low REAL, close REAL, cycle_id INTEGER
        );
        CREATE INDEX idx_candles_asset_date ON candles(asset, trading_date);
        CREATE INDEX idx_cycles_asset ON cycles(asset);
        CREATE INDEX idx_cycles_search ON cycles(asset, cycle_id, cycle_bias, daily_bias);
    """)

def process_asset(asset, filepath, conn):
    t0 = time.time()
    print(f"  Loading {asset}...")
    df = load_csv(filepath)
    df = assign_trading_day(df)
    df = assign_cycle(df)
    ndays = df["trading_date"].nunique()
    print(f"  {len(df):,} bars, {ndays} days ({time.time()-t0:.1f}s)")

    df["td_str"] = df["trading_date"].astype(str)
    df_sorted = df.sort_values("timestamp")

    # Day aggregation
    t1 = time.time()
    day_agg = df_sorted.groupby("td_str").agg(
        day_open=("open", "first"), day_high=("high", "max"),
        day_low=("low", "min"), day_close=("close", "last"),
    )
    day_agg["day_range"] = day_agg["day_high"] - day_agg["day_low"]
    day_agg["day_direction"] = np.where(day_agg["day_close"] >= day_agg["day_open"], "Up", "Down")
    day_agg["weekday"] = pd.to_datetime(day_agg.index).weekday
    day_agg["asset"] = asset
    day_agg.index.name = "trading_date"
    day_agg.reset_index(inplace=True)
    day_agg[["asset","trading_date","day_open","day_high","day_low","day_close","day_range","day_direction","weekday"]].to_sql("days", conn, if_exists="append", index=False)
    print(f"  Days: {len(day_agg)} ({time.time()-t1:.1f}s)")

    day_lk = day_agg.set_index("trading_date")[["day_open","day_high","day_low","day_close","day_range","day_direction","weekday"]].to_dict("index")

    # Cycle aggregation
    t1 = time.time()
    cyc_agg = df_sorted.groupby(["td_str", "cycle_id"]).agg(
        cycle_open=("open", "first"), cycle_high=("high", "max"),
        cycle_low=("low", "min"), cycle_close=("close", "last"),
    ).reset_index().rename(columns={"td_str": "trading_date"})
    print(f"  Cycle agg: {len(cyc_agg)} ({time.time()-t1:.1f}s)")

    # Daily bias
    t1 = time.time()
    sorted_dates = sorted(day_lk.keys())
    daily_bias_map = {}
    for i, td in enumerate(sorted_dates):
        if i < 2:
            daily_bias_map[td] = "No Bias"
            continue
        d1, d2 = day_lk[sorted_dates[i-1]], day_lk[sorted_dates[i-2]]
        daily_bias_map[td] = compute_bias(d1["day_high"], d1["day_low"], d1["day_close"], d2["day_high"], d2["day_low"])
    print(f"  Daily bias ({time.time()-t1:.1f}s)")

    # Cycle bias
    t1 = time.time()
    cyc_sorted = cyc_agg.sort_values(["trading_date", "cycle_id"]).reset_index(drop=True)
    cb_list = ["No Bias", "No Bias"]
    for i in range(2, len(cyc_sorted)):
        r1, r2 = cyc_sorted.iloc[i-1], cyc_sorted.iloc[i-2]
        cb_list.append(compute_bias(r1["cycle_high"], r1["cycle_low"], r1["cycle_close"], r2["cycle_high"], r2["cycle_low"]))
    cyc_sorted["cycle_bias"] = cb_list
    print(f"  Cycle bias ({time.time()-t1:.1f}s)")

    # True Opens
    t1 = time.time()
    co_lookup = {}
    for _, r in cyc_sorted.iterrows():
        co_lookup[(r["trading_date"], int(r["cycle_id"]))] = r["cycle_open"]

    w_to_map, current_w_to = {}, None
    for td in sorted_dates:
        wd = day_lk[td]["weekday"]
        if wd == 6:
            key = (td, 2)
            if key in co_lookup:
                current_w_to = co_lookup[key]
        w_to_map[td] = current_w_to

    d_to_map = {td: co_lookup.get((td, 2)) for td in sorted_dates}

    s_to_map = {}
    for td in sorted_dates:
        for session, m_cid in SESSION_M_PHASE.items():
            price = co_lookup.get((td, m_cid))
            for c in CYCLES:
                if c.session == session:
                    s_to_map[(td, c.cycle_id)] = price
    print(f"  True opens ({time.time()-t1:.1f}s)")

    # Assemble cycles table
    t1 = time.time()
    session_map = {c.cycle_id: c.session for c in CYCLES}
    phase_map = {c.cycle_id: c.phase for c in CYCLES}
    cyc_sorted["session"] = cyc_sorted["cycle_id"].map(session_map)
    cyc_sorted["phase"] = cyc_sorted["cycle_id"].map(phase_map)
    cyc_sorted["daily_bias"] = cyc_sorted["trading_date"].map(daily_bias_map)
    cyc_sorted["asset"] = asset
    cyc_sorted["w_to_price"] = cyc_sorted["trading_date"].map(w_to_map)
    cyc_sorted["d_to_price"] = cyc_sorted["trading_date"].map(d_to_map)
    cyc_sorted["s_to_price"] = cyc_sorted.apply(lambda r: s_to_map.get((r["trading_date"], int(r["cycle_id"]))), axis=1)

    def pos(co, ref):
        if pd.isna(co) or ref is None or pd.isna(ref):
            return None
        return "Above" if co > ref else "Below"

    cyc_sorted["w_to_pos"] = cyc_sorted.apply(lambda r: pos(r["cycle_open"], r["w_to_price"]), axis=1)
    cyc_sorted["d_to_pos"] = cyc_sorted.apply(lambda r: pos(r["cycle_open"], r["d_to_price"]), axis=1)
    cyc_sorted["s_to_pos"] = cyc_sorted.apply(lambda r: pos(r["cycle_open"], r["s_to_price"]), axis=1)

    for col in ["day_open","day_high","day_low","day_close","day_range","day_direction"]:
        cyc_sorted[col] = cyc_sorted["trading_date"].map(lambda td, c=col: day_lk.get(td, {}).get(c))
    cyc_sorted["day_pct"] = np.where(
        cyc_sorted["day_open"] != 0,
        ((cyc_sorted["day_close"] - cyc_sorted["day_open"]) / cyc_sorted["day_open"] * 100).round(4), 0)

    cols = ["asset","trading_date","cycle_id","session","phase",
            "cycle_open","cycle_high","cycle_low","cycle_close",
            "cycle_bias","daily_bias","w_to_price","d_to_price","s_to_price",
            "w_to_pos","d_to_pos","s_to_pos",
            "day_open","day_high","day_low","day_close","day_range","day_pct","day_direction"]
    cyc_sorted[cols].to_sql("cycles", conn, if_exists="append", index=False)
    print(f"  Cycles inserted: {len(cyc_sorted)} ({time.time()-t1:.1f}s)")

    # Candles
    t1 = time.time()
    candle_df = df_sorted[["td_str","timestamp","open","high","low","close","cycle_id"]].copy()
    candle_df.insert(0, "asset", asset)
    candle_df["timestamp"] = candle_df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S%z")
    candle_df.rename(columns={"td_str": "trading_date"}, inplace=True)
    candle_df.to_sql("candles", conn, if_exists="append", index=False)
    print(f"  Candles inserted: {len(candle_df)} ({time.time()-t1:.1f}s)")

def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if BUILD_PATH.exists():
        BUILD_PATH.unlink()
    conn = sqlite3.connect(str(BUILD_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-512000")
    print("Creating schema...")
    create_schema(conn)
    t_total = time.time()
    for asset, fpath in ASSETS.items():
        if not fpath.exists() and not fpath.is_symlink():
            print(f"  SKIP {asset}: not found")
            continue
        process_asset(asset, fpath, conn)
        conn.commit()
        print()
    elapsed = time.time() - t_total
    print(f"Total time: {elapsed:.1f}s")
    cur = conn.execute("SELECT asset, COUNT(*) FROM cycles GROUP BY asset")
    print("Cycles summary:")
    for row in cur:
        print(f"  {row[0]}: {row[1]:,}")
    conn.close()
    # Copy to project dir
    shutil.copy2(str(BUILD_PATH), str(DB_PATH))
    for ext in ["", "-wal", "-shm"]:
        p = Path(str(BUILD_PATH) + ext)
        if p.exists():
            p.unlink()
    print(f"Database copied to {DB_PATH}")

if __name__ == "__main__":
    main()
