from __future__ import annotations

from typing import Sequence

from .models import Candle

_UNIT_MS = {"m": 60_000, "h": 3_600_000, "d": 86_400_000, "w": 604_800_000}
YEAR_MS = 365 * 86_400_000


def timeframe_to_ms(timeframe: str) -> int:
    """'15m' -> 900000, '1h' -> 3600000, '1d' -> 86400000."""
    tf = timeframe.strip()
    if len(tf) < 2 or tf[-1] not in _UNIT_MS or not tf[:-1].isdigit() or int(tf[:-1]) < 1:
        raise ValueError(f"Timeframe invalide : {timeframe!r} (exemples : 1m, 15m, 1h, 4h, 1d)")
    return int(tf[:-1]) * _UNIT_MS[tf[-1]]


def bars_per_year(timeframe: str) -> float:
    return YEAR_MS / timeframe_to_ms(timeframe)


def closed_candles(candles: Sequence[Candle], timeframe: str, now_ms: int) -> list[Candle]:
    """Retire les bougies encore en cours de formation.

    Une bougie ouverte à t n'est terminée qu'à t + durée. Les plateformes
    renvoient la bougie en cours en dernier : l'utiliser reviendrait à
    décider sur un prix de clôture qui n'existe pas encore.
    """
    tf_ms = timeframe_to_ms(timeframe)
    return [c for c in candles if c.timestamp + tf_ms <= now_ms]
