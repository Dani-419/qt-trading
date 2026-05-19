"""CSV loader: semicolon-delimited 1m OHLC files -> CST timestamps."""
import pandas as pd
from pathlib import Path

def load_csv(filepath):
    df = pd.read_csv(
        filepath, sep=";", header=None,
        names=["date", "time", "open", "high", "low", "close", "volume"],
        dtype={"date": str, "time": str},
    )
    df.drop(columns=["volume"], inplace=True)
    df["timestamp"] = pd.to_datetime(df["date"] + " " + df["time"], dayfirst=True)
    df["timestamp"] = df["timestamp"].dt.tz_localize("America/Chicago")
    df.drop(columns=["date", "time"], inplace=True)
    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df
