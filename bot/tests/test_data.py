import math

import ccxt
import pytest

from tradebot.data import (
    Candle, CsvProvider, DataUnavailableError, closed_candles, is_stale, load_candles_csv,
    save_candles_csv, timeframe_to_ms, validate_candles,
)
from tradebot.data.ccxt_provider import CcxtProvider
from tradebot.data.retry import retry_call

from .helpers import HOUR, T0, FakeProvider, make_candles


def test_timeframe_parsing():
    assert timeframe_to_ms("1m") == 60_000
    assert timeframe_to_ms("15m") == 900_000
    assert timeframe_to_ms("4h") == 4 * HOUR
    assert timeframe_to_ms("1d") == 24 * HOUR
    for bad in ("", "h", "0h", "1x", "1.5h"):
        with pytest.raises(ValueError):
            timeframe_to_ms(bad)


def test_in_progress_candle_is_removed():
    candles = make_candles([1, 2, 3])
    # À T0 + 2h + 30 min, la 3e bougie (ouverte à T0 + 2h) est en cours.
    now = T0 + 2 * HOUR + 30 * 60_000
    assert closed_candles(candles, "1h", now) == candles[:2]
    # Exactement à sa clôture, elle est terminée.
    assert closed_candles(candles, "1h", T0 + 3 * HOUR) == candles


def test_validation_accepts_clean_data():
    report = validate_candles(make_candles([1, 2, 3, 2]), "1h")
    assert report.ok and not report.warnings


@pytest.mark.parametrize(
    "bad,message",
    [
        (Candle(T0 + 2 * HOUR, 3, 3.1, 2.9, -1, 1), "négatif"),
        (Candle(T0 + 2 * HOUR, 3, 2.0, 2.9, 3, 1), "incohérent"),
        (Candle(T0 + 2 * HOUR, 3, math.nan, 2.9, 3, 1), "non numérique"),
        (Candle(T0 + HOUR, 3, 3.1, 2.9, 3, 1), "doublon"),
    ],
)
def test_validation_rejects_bad_candles(bad, message):
    candles = make_candles([1, 2]) + [bad]
    report = validate_candles(candles, "1h")
    assert not report.ok
    assert any(message in e for e in report.errors)


def test_validation_warns_on_gaps():
    candles = make_candles([1, 2, 3])
    gapped = [candles[0], candles[2]]
    report = validate_candles(gapped, "1h")
    assert report.ok and any("trou" in w for w in report.warnings)


def test_staleness():
    last = make_candles([1])[0]
    closed_at = T0 + HOUR
    assert not is_stale(last, "1h", closed_at + HOUR, max_bars=2)
    assert is_stale(last, "1h", closed_at + 2 * HOUR + 1, max_bars=2)


def test_csv_roundtrip(tmp_path):
    candles = make_candles([1, 2, 3, 4])
    path = tmp_path / "c.csv"
    save_candles_csv(path, candles)
    assert load_candles_csv(path) == candles
    provider = CsvProvider(path)
    assert provider.fetch_quote("X").last == 4
    assert provider.fetch_ohlcv("X", "1h", limit=2) == candles[-2:]


def test_fetch_history_paginates_and_deduplicates():
    candles = make_candles(list(range(1, 26)))

    class Paged(FakeProvider):
        def fetch_ohlcv(self, symbol, timeframe, since=None, limit=None):
            self.calls += 1
            page = [c for c in self.candles if c.timestamp >= since][:limit]
            return page + page[-1:]  # doublon volontaire

    provider = Paged(candles)
    history = provider.fetch_history("X", "1h", T0 + 2 * HOUR, T0 + 22 * HOUR, page_limit=7)
    assert history == candles[2:22]
    assert provider.calls >= 3


# --- Reconnexion API ---------------------------------------------------------
class FlakyExchange:
    def __init__(self, failures, error=ccxt.NetworkError):
        self.failures = failures
        self.error = error
        self.calls = 0

    def fetch_ohlcv(self, symbol, timeframe, since=None, limit=None):
        self.calls += 1
        if self.calls <= self.failures:
            raise self.error("timeout")
        return [[T0, 1, 2, 0.5, 1.5, 10]]

    def fetch_ticker(self, symbol):
        return {"last": 42.0, "timestamp": T0}


def test_ccxt_provider_retries_network_errors_with_backoff():
    sleeps = []
    exchange = FlakyExchange(failures=2)
    provider = CcxtProvider("binance", exchange=exchange, max_retries=4, base_delay=1, sleep=sleeps.append)
    candles = provider.fetch_ohlcv("BTC/USDT", "1h")
    assert candles == [Candle(T0, 1, 2, 0.5, 1.5, 10)]
    assert exchange.calls == 3
    assert sleeps == [1, 2]


def test_ccxt_provider_gives_up_after_max_retries():
    sleeps = []
    provider = CcxtProvider("binance", exchange=FlakyExchange(failures=99), max_retries=3, sleep=sleeps.append)
    with pytest.raises(DataUnavailableError):
        provider.fetch_ohlcv("BTC/USDT", "1h")
    assert len(sleeps) == 3


def test_ccxt_provider_does_not_retry_permanent_errors():
    sleeps = []
    exchange = FlakyExchange(failures=1, error=ccxt.BadSymbol)
    provider = CcxtProvider("binance", exchange=exchange, sleep=sleeps.append)
    with pytest.raises(DataUnavailableError):
        provider.fetch_ohlcv("NOPE/USDT", "1h")
    assert exchange.calls == 1 and sleeps == []


def test_ccxt_provider_quote():
    provider = CcxtProvider("binance", exchange=FlakyExchange(0))
    assert provider.fetch_quote("BTC/USDT").last == 42.0


def test_retry_call_caps_delay():
    sleeps = []
    attempts = iter([OSError(), OSError(), OSError(), "ok"])

    def fn():
        value = next(attempts)
        if isinstance(value, Exception):
            raise value
        return value

    assert retry_call(fn, retry_on=(OSError,), base_delay=10, max_delay=15, sleep=sleeps.append) == "ok"
    assert sleeps == [10, 15, 15]
