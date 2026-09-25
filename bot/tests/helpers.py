from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Optional, Sequence

from tradebot.config import Settings
from tradebot.data import Candle, DataUnavailableError, MarketDataProvider, Quote, timeframe_to_ms
from tradebot.signals import Action, Signal
from tradebot.strategies import Strategy

HOUR = 3_600_000
T0 = 1_704_067_200_000  # 2024-01-01 00:00 UTC


def make_candles(closes: Sequence[float], *, start_ms: int = T0, tf_ms: int = HOUR, spread: float = 0.001) -> list[Candle]:
    """Bougies simples : ouverture = clôture précédente, mèches de +/- spread."""
    candles = []
    prev = closes[0]
    for i, close in enumerate(closes):
        o = prev
        candles.append(
            Candle(start_ms + i * tf_ms, o, max(o, close) * (1 + spread), min(o, close) * (1 - spread), close, 100.0)
        )
        prev = close
    return candles


class ScriptedStrategy(Strategy):
    """Stratégie de test : émet l'action prévue pour chaque index de bougie."""

    name = "scripted"

    def __init__(self, script: dict[int, Action] | None = None, warmup: int = 1, by_timestamp: dict[int, Action] | None = None):
        self.script = script or {}
        self.by_timestamp = by_timestamp or {}
        self._warmup = warmup

    @property
    def warmup(self) -> int:
        return self._warmup

    def params(self) -> dict:
        return {}

    def generate_signals(self, candles, symbol):
        out = []
        for i, c in enumerate(candles):
            action = self.by_timestamp.get(c.timestamp, self.script.get(i, Action.HOLD))
            out.append(Signal(action, symbol, c.timestamp, c.close, self.name, f"script {action.value}", {"i": i}))
        return out


class FakeProvider(MarketDataProvider):
    """Source de données contrôlée par le test (aucun réseau)."""

    name = "fake"

    def __init__(self, candles: list[Candle], price: Optional[float] = None, in_progress: Optional[Candle] = None):
        self.candles = candles
        self.price = price if price is not None else candles[-1].close
        self.in_progress = in_progress
        self.failures_left = 0
        self.always_fail = False
        self.calls = 0

    def _maybe_fail(self):
        self.calls += 1
        if self.always_fail or self.failures_left > 0:
            self.failures_left = max(0, self.failures_left - 1)
            raise DataUnavailableError("API injoignable (simulé)")

    def fetch_ohlcv(self, symbol, timeframe, since=None, limit=None):
        self._maybe_fail()
        data = list(self.candles) + ([self.in_progress] if self.in_progress else [])
        return data[-limit:] if limit else data

    def fetch_quote(self, symbol):
        return Quote(symbol, self.candles[-1].timestamp, self.price)


class FakeClock:
    def __init__(self, now_ms: int):
        self.now = now_ms

    def __call__(self) -> int:
        return self.now


def make_settings(tmp_path: Path, **overrides) -> Settings:
    base = Settings(
        state_dir=tmp_path / "state",
        log_dir=tmp_path / "logs",
        enable_trading=True,
        poll_seconds=1,
        max_consecutive_errors=3,
    )
    return replace(base, **overrides)


def close_time(candle: Candle, timeframe: str = "1h") -> int:
    return candle.timestamp + timeframe_to_ms(timeframe)
