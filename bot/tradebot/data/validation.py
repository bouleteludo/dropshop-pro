from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

from .models import Candle
from .timeframes import timeframe_to_ms


@dataclass
class ValidationReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_candles(candles: Sequence[Candle], timeframe: str) -> ValidationReport:
    """Détecte les données inexploitables (erreurs) ou douteuses (avertissements)."""
    report = ValidationReport()
    if not candles:
        report.errors.append("aucune bougie")
        return report
    tf_ms = timeframe_to_ms(timeframe)
    gaps = zero_volume = 0
    for i, c in enumerate(candles):
        values = (c.open, c.high, c.low, c.close, c.volume)
        if not all(math.isfinite(v) for v in values):
            report.errors.append(f"bougie {c.timestamp} : valeur non numérique")
            continue
        if min(c.open, c.high, c.low, c.close) <= 0:
            report.errors.append(f"bougie {c.timestamp} : prix nul ou négatif")
        if c.high < max(c.open, c.close) or c.low > min(c.open, c.close) or c.low > c.high:
            report.errors.append(f"bougie {c.timestamp} : OHLC incohérent")
        if c.volume < 0:
            report.errors.append(f"bougie {c.timestamp} : volume négatif")
        elif c.volume == 0:
            zero_volume += 1
        if i:
            delta = c.timestamp - candles[i - 1].timestamp
            if delta <= 0:
                report.errors.append(f"bougie {c.timestamp} : doublon ou ordre chronologique incorrect")
            elif delta > tf_ms:
                gaps += 1
    if gaps:
        report.warnings.append(f"{gaps} trou(s) dans l'historique")
    if zero_volume:
        report.warnings.append(f"{zero_volume} bougie(s) sans volume")
    return report


def is_stale(last_candle: Candle, timeframe: str, now_ms: int, max_bars: int) -> bool:
    """Vrai si la dernière bougie terminée est trop ancienne (flux interrompu)."""
    tf_ms = timeframe_to_ms(timeframe)
    closed_at = last_candle.timestamp + tf_ms
    return now_ms - closed_at > max_bars * tf_ms
