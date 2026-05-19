"""Trading-day and cycle assignment for 1-minute bars.
Trading day starts at 17:00 CST."""
import pandas as pd
import numpy as np
from .cycles import CYCLES, CYCLE_BY_ID

def assign_trading_day(df):
    """Add 'trading_date' column. If hour < 17, trading_date = previous calendar date."""
    ts = df["timestamp"]
    hours = ts.dt.hour
    # For bars before 17:00, subtract one day
    cal_dates = ts.dt.normalize()
    offset = pd.to_timedelta((hours < 17).astype(int), unit="D")
    df["trading_date"] = (cal_dates - offset).dt.date
    return df

def assign_cycle(df):
    """Add 'cycle_id' column (1-16) based on CST time within trading day."""
    hours = df["timestamp"].dt.hour
    minutes = df["timestamp"].dt.minute
    total_min = (hours * 60 + minutes - 17 * 60) % (24 * 60)

    boundaries = []
    for c in CYCLES:
        m = (c.start_hour * 60 + c.start_minute - 17 * 60) % (24 * 60)
        boundaries.append((m, c.cycle_id))
    boundaries.sort(key=lambda x: x[0])

    starts = np.array([b[0] for b in boundaries])
    ids = np.array([b[1] for b in boundaries])
    idx = np.searchsorted(starts, total_min.values, side="right") - 1
    idx = np.clip(idx, 0, len(ids) - 1)
    df["cycle_id"] = ids[idx]
    return df

def get_cycle_session(cycle_id):
    return CYCLE_BY_ID[cycle_id].session
