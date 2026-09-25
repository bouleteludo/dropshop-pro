from __future__ import annotations

import time
from typing import Callable, Optional

from .models import Candle, Quote
from .provider import DataUnavailableError, MarketDataProvider
from .retry import retry_call


class CcxtProvider(MarketDataProvider):
    """Données de marché publiques via ccxt (Binance, Kraken, Bybit…).

    Aucune clé API n'est transmise : cette classe ne peut que LIRE des prix,
    jamais passer d'ordre.
    """

    def __init__(
        self,
        exchange_id: str,
        *,
        exchange=None,
        max_retries: int = 4,
        base_delay: float = 1.0,
        sleep: Callable[[float], None] = time.sleep,
    ):
        import ccxt

        self._ccxt = ccxt
        if exchange is None:
            if not hasattr(ccxt, exchange_id):
                raise ValueError(f"Plateforme inconnue de ccxt : {exchange_id!r}")
            exchange = getattr(ccxt, exchange_id)({"enableRateLimit": True})
        self._exchange = exchange
        self.name = f"ccxt:{exchange_id}"
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._sleep = sleep

    def _call(self, description: str, fn: Callable):
        try:
            return retry_call(
                fn,
                retry_on=(self._ccxt.NetworkError,),
                max_retries=self._max_retries,
                base_delay=self._base_delay,
                sleep=self._sleep,
                description=description,
            )
        except self._ccxt.BaseError as exc:
            raise DataUnavailableError(f"{description} : {type(exc).__name__}: {exc}") from exc

    def fetch_ohlcv(
        self, symbol: str, timeframe: str, since: Optional[int] = None, limit: Optional[int] = None
    ) -> list[Candle]:
        rows = self._call(
            f"fetch_ohlcv {symbol} {timeframe}",
            lambda: self._exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=limit),
        )
        return [Candle.from_ohlcv(r) for r in rows or []]

    def fetch_quote(self, symbol: str) -> Quote:
        ticker = self._call(f"fetch_ticker {symbol}", lambda: self._exchange.fetch_ticker(symbol))
        last = ticker.get("last") or ticker.get("close")
        if last is None:
            raise DataUnavailableError(f"Ticker {symbol} sans prix")
        return Quote(
            symbol=symbol,
            timestamp=int(ticker.get("timestamp") or time.time() * 1000),
            last=float(last),
            bid=ticker.get("bid"),
            ask=ticker.get("ask"),
        )
