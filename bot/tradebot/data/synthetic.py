"""Données de marché SYNTHÉTIQUES (marche aléatoire à régimes).

Uniquement pour tester le code hors-ligne. Un backtest sur ces données n'a
AUCUNE valeur pour juger une stratégie.
"""

from __future__ import annotations

import math
import random

from .models import Candle
from .timeframes import timeframe_to_ms

DEFAULT_START_MS = 1_704_067_200_000  # 2024-01-01 00:00 UTC


def generate_candles(
    n: int,
    *,
    timeframe: str = "1h",
    start_price: float = 30_000.0,
    start_ms: int = DEFAULT_START_MS,
    volatility: float = 0.006,
    regime_length: int = 200,
    seed: int = 42,
) -> list[Candle]:
    rng = random.Random(seed)
    tf_ms = timeframe_to_ms(timeframe)
    candles = []
    price = start_price
    drift = 0.0
    for i in range(n):
        if i % regime_length == 0:
            # Alterne tendances haussières, baissières et marchés sans direction.
            drift = rng.choice((-1, 0, 1)) * volatility * rng.uniform(0.05, 0.25)
        o = price
        c = o * math.exp(drift + rng.gauss(0.0, volatility))
        h = max(o, c) * (1 + abs(rng.gauss(0.0, volatility / 2)))
        l = min(o, c) * (1 - abs(rng.gauss(0.0, volatility / 2)))
        candles.append(Candle(start_ms + i * tf_ms, o, h, l, c, rng.uniform(50, 150)))
        price = c
    return candles
