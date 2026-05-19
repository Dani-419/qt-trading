"""
Single source of truth for ICT 90-minute cycle definitions.
All times are CST (America/Chicago). Trading day starts 17:00 CST.
"""

from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class CycleDef:
    cycle_id: int
    session: str   # Asia, London, NY, PM
    phase: str     # A, M, D, X
    start_hour: int
    start_minute: int

    @property
    def label(self) -> str:
        return f"{self.start_hour:02d}:{self.start_minute:02d} {self.session} {self.phase}"

# All 16 cycles per trading day (17:00 CST start)
CYCLES: List[CycleDef] = [
    CycleDef(1,  "Asia",   "A", 17, 0),
    CycleDef(2,  "Asia",   "M", 18, 30),
    CycleDef(3,  "Asia",   "D", 20, 0),
    CycleDef(4,  "Asia",   "X", 21, 30),
    CycleDef(5,  "London", "A", 23, 0),
    CycleDef(6,  "London", "M",  0, 30),
    CycleDef(7,  "London", "D",  2, 0),
    CycleDef(8,  "London", "X",  3, 30),
    CycleDef(9,  "NY",     "A",  5, 0),
    CycleDef(10, "NY",     "M",  6, 30),
    CycleDef(11, "NY",     "D",  8, 0),
    CycleDef(12, "NY",     "X",  9, 30),
    CycleDef(13, "PM",     "A", 11, 0),
    CycleDef(14, "PM",     "M", 12, 30),
    CycleDef(15, "PM",     "D", 14, 0),
    CycleDef(16, "PM",     "X", 15, 30),
]

CYCLE_BY_ID = {c.cycle_id: c for c in CYCLES}

# Session M-phase cycle IDs (used for True Session Open)
SESSION_M_PHASE = {
    "Asia": 2,
    "London": 6,
    "NY": 10,
    "PM": 14,
}

# True Day Open = cycle 2 (18:30 Asia M)
TRUE_DAY_OPEN_CYCLE = 2

# True Week Open = cycle 2 on Monday (18:30 Monday)
TRUE_WEEK_OPEN_CYCLE = 2
