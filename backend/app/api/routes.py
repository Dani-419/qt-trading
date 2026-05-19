"""API route handlers."""
import sqlite3
from pathlib import Path
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd

from ..core.cycles import CYCLES
from ..core.loader import load_csv
from ..core.trading_day import assign_trading_day, assign_cycle

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "data" / "ict_cycles.db"
RAW_DIR = PROJECT_ROOT / "data" / "raw"

# Cache loaded DataFrames
_df_cache = {}

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def get_asset_df(asset: str) -> pd.DataFrame:
    if asset not in _df_cache:
        fpath = RAW_DIR / f"{asset}_1m.csv"
        if not fpath.exists():
            return pd.DataFrame()
        df = load_csv(fpath)
        df = assign_trading_day(df)
        df = assign_cycle(df)
        df["td_str"] = df["trading_date"].astype(str)
        _df_cache[asset] = df
    return _df_cache[asset]


class SearchRequest(BaseModel):
    asset: str
    cycle_id: int
    cycle_bias: Optional[str] = None
    daily_bias: Optional[str] = None
    w_to: Optional[str] = None
    d_to: Optional[str] = None
    s_to: Optional[str] = None
    bias_logic: str = "and"
    date_from: Optional[str] = None
    date_to: Optional[str] = None


@router.get("/assets")
def get_assets():
    return ["NQ", "ES", "YM"]


@router.get("/cycles")
def get_cycles():
    return [
        {"cycle_id": c.cycle_id, "session": c.session, "phase": c.phase,
         "start_time": f"{c.start_hour:02d}:{c.start_minute:02d}", "label": c.label}
        for c in CYCLES
    ]


@router.post("/search")
def search(req: SearchRequest):
    conn = get_db()
    conditions = ["asset = ?", "cycle_id = ?"]
    params = [req.asset, req.cycle_id]

    bias_parts = []
    if req.cycle_bias:
        bias_parts.append(("cycle_bias = ?", req.cycle_bias))
    if req.daily_bias:
        bias_parts.append(("daily_bias = ?", req.daily_bias))

    if bias_parts:
        if req.bias_logic == "or" and len(bias_parts) == 2:
            conditions.append(f"({bias_parts[0][0]} OR {bias_parts[1][0]})")
            params.extend([bias_parts[0][1], bias_parts[1][1]])
        else:
            for sql, val in bias_parts:
                conditions.append(sql)
                params.append(val)

    if req.w_to:
        conditions.append("w_to_pos = ?"); params.append(req.w_to)
    if req.d_to:
        conditions.append("d_to_pos = ?"); params.append(req.d_to)
    if req.s_to:
        conditions.append("s_to_pos = ?"); params.append(req.s_to)
    if req.date_from:
        conditions.append("trading_date >= ?"); params.append(req.date_from)
    if req.date_to:
        conditions.append("trading_date <= ?"); params.append(req.date_to)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT trading_date, cycle_id, cycle_bias, daily_bias,
               w_to_pos, d_to_pos, s_to_pos,
               day_open, day_close, day_high, day_low,
               day_range, day_pct, day_direction,
               cycle_open, cycle_high, cycle_low, cycle_close
        FROM cycles WHERE {where}
        ORDER BY trading_date DESC
    """
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        # Aliases for compatibility with alternative frontends
        d["date"] = d["trading_date"]
        cid = req.cycle_id
        cdef = next((c for c in CYCLES if c.cycle_id == cid), None)
        d["cycle"] = cdef.label if cdef else str(cid)
        results.append(d)
    return results


@router.get("/day/{asset}/{date}")
def get_day(asset: str, date: str):
    conn = get_db()

    # Cycle info from DB
    cycles_raw = conn.execute(
        "SELECT cycle_id, session, phase, cycle_open, cycle_high, cycle_low, cycle_close, "
        "cycle_bias, daily_bias, w_to_price, d_to_price, s_to_price, "
        "w_to_pos, d_to_pos, s_to_pos "
        "FROM cycles WHERE asset=? AND trading_date=? ORDER BY cycle_id",
        (asset, date),
    ).fetchall()

    conn.close()

    # Candles from CSV (cached in memory) — return as bars with Unix time
    df = get_asset_df(asset)
    day_df = df[df["td_str"] == date].sort_values("timestamp")
    bars = []
    for _, r in day_df.iterrows():
        bars.append({
            "time": int(r["timestamp"].timestamp()),
            "open": r["open"], "high": r["high"],
            "low": r["low"], "close": r["close"],
            "cycle_id": int(r["cycle_id"]),
        })

    # Build cycles array in frontend-expected format
    cycles_out = []
    for c in cycles_raw:
        cd = dict(c)
        cycles_out.append({
            "cycle_id": cd["cycle_id"],
            "session": cd["session"],
            "phase": cd["phase"],
            "open": cd["cycle_open"],
            "high": cd["cycle_high"],
            "low": cd["cycle_low"],
            "close": cd["cycle_close"],
            "cycle_bias": cd["cycle_bias"],
            "daily_bias": cd.get("daily_bias", ""),
            "w_to_pos": cd.get("w_to_pos", ""),
            "d_to_pos": cd.get("d_to_pos", ""),
            "s_to_pos": cd.get("s_to_pos", ""),
        })

    # Build true_opens from cycle data
    true_opens = {
        "w_to": None, "d_to": None,
        "s_to_asia": None, "s_to_london": None,
        "s_to_ny": None, "s_to_pm": None,
    }
    session_key_map = {"Asia": "s_to_asia", "London": "s_to_london", "NY": "s_to_ny", "PM": "s_to_pm"}
    for c in cycles_raw:
        cd = dict(c)
        if cd["cycle_id"] == 2:  # True Day/Week Open cycle
            true_opens["w_to"] = cd["w_to_price"]
            true_opens["d_to"] = cd["d_to_price"]
        key = session_key_map.get(cd["session"])
        if key and cd["phase"] == "M" and cd["s_to_price"] is not None:
            true_opens[key] = cd["s_to_price"]

    return {
        "asset": asset,
        "date": date,
        "bars": bars,
        "cycles": cycles_out,
        "true_opens": true_opens,
    }


@router.get("/stats")
def get_stats(asset: str = "NQ"):
    conn = get_db()
    rows = conn.execute(
        "SELECT cycle_bias, daily_bias, COUNT(*) as cnt FROM cycles WHERE asset=? GROUP BY cycle_bias, daily_bias",
        (asset,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
