from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from .models import Candle, Quote
from .timeframes import timeframe_to_ms


class DataUnavailableError(RuntimeError):
    """La source de données n'a pas pu fournir les données demandées."""


class MarketDataProvider(ABC):
    """Interface commune à toutes les sources de données.

    Le reste du bot ne dépend que de cette interface : changer de fournisseur
    (autre plateforme, CSV, données synthétiques, websocket en V2) ne demande
    qu'une nouvelle implémentation.
    """

    name: str = "abstract"

    @abstractmethod
    def fetch_ohlcv(
        self, symbol: str, timeframe: str, since: Optional[int] = None, limit: Optional[int] = None
    ) -> list[Candle]:
        """Bougies triées par date croissante. Peut inclure la bougie en cours."""

    @abstractmethod
    def fetch_quote(self, symbol: str) -> Quote:
        """Dernier prix connu."""

    def fetch_history(
        self, symbol: str, timeframe: str, start_ms: int, end_ms: int, page_limit: int = 1000
    ) -> list[Candle]:
        """Historique [start_ms, end_ms[ récupéré page par page."""
        tf_ms = timeframe_to_ms(timeframe)
        out: dict[int, Candle] = {}
        cursor = start_ms
        while cursor < end_ms:
            page = self.fetch_ohlcv(symbol, timeframe, since=cursor, limit=page_limit)
            page = [c for c in page if start_ms <= c.timestamp < end_ms]
            if not page:
                break
            for c in page:
                out[c.timestamp] = c
            next_cursor = page[-1].timestamp + tf_ms
            if next_cursor <= cursor:
                break
            cursor = next_cursor
        return [out[ts] for ts in sorted(out)]
