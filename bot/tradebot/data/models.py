from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence


@dataclass(frozen=True)
class Candle:
    """Bougie OHLCV. `timestamp` = heure d'OUVERTURE en millisecondes UTC."""

    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    @classmethod
    def from_ohlcv(cls, row: Sequence) -> "Candle":
        ts, o, h, l, c, v = row[:6]
        return cls(int(ts), float(o), float(h), float(l), float(c), float(v or 0.0))


@dataclass(frozen=True)
class Quote:
    """Prix instantané d'un actif."""

    symbol: str
    timestamp: int
    last: float
    bid: Optional[float] = None
    ask: Optional[float] = None
