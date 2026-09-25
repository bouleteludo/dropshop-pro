from __future__ import annotations

from typing import Optional, Sequence

Series = list[Optional[float]]


def sma(values: Sequence[float], period: int) -> Series:
    """Moyenne mobile simple. None tant qu'il n'y a pas `period` valeurs."""
    if period < 1:
        raise ValueError("period doit être >= 1")
    out: Series = [None] * len(values)
    for i in range(period - 1, len(values)):
        out[i] = sum(values[i - period + 1 : i + 1]) / period
    return out


def ema(values: Sequence[float], period: int) -> Series:
    """Moyenne mobile exponentielle, initialisée par la SMA des `period`
    premières valeurs. La valeur à l'index i n'utilise que values[:i+1]."""
    if period < 1:
        raise ValueError("period doit être >= 1")
    out: Series = [None] * len(values)
    if len(values) < period:
        return out
    alpha = 2.0 / (period + 1)
    current = sum(values[:period]) / period
    out[period - 1] = current
    for i in range(period, len(values)):
        current = alpha * values[i] + (1 - alpha) * current
        out[i] = current
    return out
