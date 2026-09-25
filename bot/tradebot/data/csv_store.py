from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable, Optional

from .models import Candle, Quote
from .provider import DataUnavailableError, MarketDataProvider

HEADER = ["timestamp", "open", "high", "low", "close", "volume"]


def save_candles_csv(path: Path, candles: Iterable[Candle]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        for c in candles:
            writer.writerow([c.timestamp, c.open, c.high, c.low, c.close, c.volume])


def load_candles_csv(path: Path) -> list[Candle]:
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        missing = set(HEADER) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path} : colonnes manquantes {sorted(missing)}")
        return [Candle.from_ohlcv([row[k] for k in HEADER]) for row in reader]


class CsvProvider(MarketDataProvider):
    """Source hors-ligne : rejoue un historique enregistré (backtests reproductibles)."""

    def __init__(self, path: Path):
        self.name = f"csv:{path.name}"
        self._candles = load_candles_csv(path)

    def fetch_ohlcv(
        self, symbol: str, timeframe: str, since: Optional[int] = None, limit: Optional[int] = None
    ) -> list[Candle]:
        candles = [c for c in self._candles if since is None or c.timestamp >= since]
        if limit is not None:
            candles = candles[:limit] if since is not None else candles[-limit:]
        return candles

    def fetch_quote(self, symbol: str) -> Quote:
        if not self._candles:
            raise DataUnavailableError("CSV vide")
        last = self._candles[-1]
        return Quote(symbol=symbol, timestamp=last.timestamp, last=last.close)
