import pytest

from tradebot.data import Candle, generate_candles
from tradebot.signals import Action
from tradebot.strategies import STRATEGIES, EmaCrossRsiStrategy, create_strategy

from .helpers import make_candles

# Baisse puis hausse puis baisse : un croisement haussier puis un baissier.
V_SHAPE = [20 - i * 0.5 for i in range(20)] + [10.5 + i * 0.7 for i in range(20)] + [24 - i * 0.8 for i in range(20)]


def signals_for(strategy, closes):
    return strategy.generate_signals(make_candles(closes), "BTC/USDT")


def test_one_signal_per_candle_with_context():
    strategy = EmaCrossRsiStrategy(fast=3, slow=6, rsi_period=3, rsi_overbought=100)
    candles = make_candles(V_SHAPE)
    signals = strategy.generate_signals(candles, "BTC/USDT")
    assert len(signals) == len(candles)
    for signal, candle in zip(signals, candles):
        assert signal.candle_timestamp == candle.timestamp
        assert signal.price == candle.close
        assert signal.strategy == "ema_cross_rsi"
        assert set(signal.indicators) == {"EMA_FAST(3)", "EMA_SLOW(6)", "RSI(3)"}
        assert signal.reason


def test_buy_on_bullish_cross_then_sell_on_bearish_cross():
    signals = signals_for(EmaCrossRsiStrategy(fast=3, slow=6, rsi_period=3, rsi_overbought=100), V_SHAPE)
    actions = [s.action for s in signals]
    assert actions.count(Action.BUY) == 1
    assert actions.count(Action.SELL) == 1
    buy, sell = actions.index(Action.BUY), actions.index(Action.SELL)
    assert 20 <= buy < sell
    b = signals[buy].indicators
    assert b["EMA_FAST(3)"] > b["EMA_SLOW(6)"]


def test_rsi_filter_blocks_overbought_entries():
    signals = signals_for(EmaCrossRsiStrategy(fast=3, slow=6, rsi_period=3, rsi_overbought=1), V_SHAPE)
    assert Action.BUY not in [s.action for s in signals]
    assert any("suracheté" in s.reason for s in signals)


def test_hold_during_warmup():
    strategy = EmaCrossRsiStrategy(fast=3, slow=6, rsi_period=3)
    signals = signals_for(strategy, V_SHAPE)
    for s in signals[: strategy.warmup - 1]:
        assert s.action is Action.HOLD and s.reason == "historique insuffisant"
    assert signals[strategy.warmup - 1].reason != "historique insuffisant"


def test_invalid_parameters():
    with pytest.raises(ValueError):
        EmaCrossRsiStrategy(fast=50, slow=20)
    with pytest.raises(ValueError):
        create_strategy("inconnue")


@pytest.mark.parametrize("name", sorted(STRATEGIES))
def test_no_lookahead_every_registered_strategy(name):
    """Contrat de toutes les stratégies : signals[i] ne dépend que de candles[:i+1].
    Vérifié à CHAQUE index : une fuite n'apparaît souvent qu'aux croisements."""
    strategy = STRATEGIES[name]()
    candles = generate_candles(350, seed=7, regime_length=40)
    full = strategy.generate_signals(candles, "BTC/USDT")
    assert {s.action for s in full} >= {Action.BUY, Action.SELL}, "la série doit contenir des croisements"
    for i in range(len(candles)):
        assert strategy.generate_signals(candles[: i + 1], "BTC/USDT")[-1] == full[i], f"fuite à l'index {i}"


def _scaled(candles, factor):
    return [Candle(c.timestamp, c.open * factor, c.high * factor, c.low * factor, c.close * factor, c.volume)
            for c in candles]


@pytest.mark.parametrize("name", sorted(STRATEGIES))
@pytest.mark.parametrize("factor", [0.1, 10.0], ids=["krach", "envolee"])
def test_future_candles_cannot_change_past_signals(name, factor):
    """On remplace tout le futur par un krach ou une envolée extrême : aucun
    signal passé ne doit bouger, quel que soit le point de coupure."""
    strategy = STRATEGIES[name]()
    candles = generate_candles(260, seed=3, regime_length=40)
    original = strategy.generate_signals(candles, "X")
    for cut in range(strategy.warmup, len(candles)):
        altered = strategy.generate_signals(candles[:cut] + _scaled(candles[cut:], factor), "X")
        assert altered[:cut] == original[:cut], f"le futur modifie le passé (coupure {cut})"
