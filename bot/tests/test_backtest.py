import pytest

from tradebot.backtesting import BacktestConfig, run_backtest
from tradebot.data import generate_candles
from tradebot.execution import CostModel
from tradebot.risk import RiskLimits
from tradebot.signals import Action
from tradebot.strategies import EmaCrossRsiStrategy

from .helpers import ScriptedStrategy, make_candles

COSTS = CostModel(0.001, 0.0005, 0.0002)
IMPACT = 1 + 0.0001 + 0.0005


def config(**kw):
    params = dict(symbol="BTC/USDT", timeframe="1h", initial_capital=10_000, costs=COSTS,
                  limits=RiskLimits(stop_loss_pct=50, take_profit_pct=500))
    params.update(kw)
    return BacktestConfig(**params)


def test_signal_is_executed_at_next_open_not_at_signal_close():
    """Anti look-ahead : décision à la clôture de i, exécution à l'ouverture de i+1."""
    closes = [100, 101, 102, 110, 120, 125, 130]
    candles = make_candles(closes)
    # Gap à l'ouverture de la bougie 3 : ouverture (101.5) ≠ clôture précédente (102).
    c3 = candles[3]
    candles[3] = c3.__class__(c3.timestamp, 101.5, c3.high, 101.0, c3.close, c3.volume)
    result = run_backtest(candles, ScriptedStrategy({2: Action.BUY, 4: Action.SELL}), config())
    [t] = result.trades
    assert t.entry_time == candles[3].timestamp
    assert t.entry_price == pytest.approx(101.5 * IMPACT)
    assert t.entry_price != pytest.approx(candles[2].close * IMPACT)
    assert t.exit_time == candles[5].timestamp
    assert t.exit_price == pytest.approx(candles[5].open * (2 - IMPACT))


def test_signal_on_last_candle_is_never_executed():
    candles = make_candles([100, 101, 102])
    result = run_backtest(candles, ScriptedStrategy({2: Action.BUY}), config())
    assert result.trades == [] and result.orders == []


def test_stop_loss_hit_inside_candle():
    closes = [100, 100, 100, 100, 100]
    candles = make_candles(closes)
    # bougie 3 : plonge à 90 puis revient
    candles[3] = candles[3].__class__(candles[3].timestamp, 100, 100.5, 90, 100, 1)
    result = run_backtest(candles, ScriptedStrategy({1: Action.BUY}),
                          config(limits=RiskLimits(stop_loss_pct=5, take_profit_pct=50)))
    [t] = result.trades
    assert t.exit_reason == "stop-loss"
    stop = candles[2].open * IMPACT * 0.95
    assert t.exit_price == pytest.approx(stop * (2 - IMPACT))  # niveau du stop, puis slippage
    assert t.exit_time == candles[3].timestamp


def test_take_profit_hit_inside_candle():
    candles = make_candles([100, 100, 100, 100, 100])
    candles[3] = candles[3].__class__(candles[3].timestamp, 100, 120, 99.5, 100, 1)
    result = run_backtest(candles, ScriptedStrategy({1: Action.BUY}),
                          config(limits=RiskLimits(stop_loss_pct=5, take_profit_pct=10)))
    [t] = result.trades
    assert t.exit_reason == "take-profit" and t.net_pnl > 0


def test_open_position_closed_at_end_and_pnl_consistent():
    candles = generate_candles(1500, seed=11)
    result = run_backtest(candles, EmaCrossRsiStrategy(), config(limits=RiskLimits()))
    m = result.metrics
    assert m.n_trades > 0
    assert m.final_equity == pytest.approx(10_000 + sum(t.net_pnl for t in result.trades))
    assert m.total_fees == pytest.approx(sum(t.fees for t in result.trades))
    assert 0 < m.exposure_pct < 100


def test_costs_reduce_performance():
    candles = generate_candles(1500, seed=11)
    strategy = EmaCrossRsiStrategy()
    with_costs = run_backtest(candles, strategy, config(limits=RiskLimits()))
    free = run_backtest(candles, strategy, config(limits=RiskLimits(), costs=CostModel(0, 0, 0)))
    assert with_costs.metrics.final_equity < free.metrics.final_equity
    assert free.metrics.total_fees == 0


def test_future_data_does_not_change_past_results():
    """Anti look-ahead au niveau du moteur : ajouter des bougies futures ne
    modifie ni la courbe de capital ni les trades passés."""
    candles = generate_candles(1200, seed=5)
    strategy = EmaCrossRsiStrategy()
    cut = 900
    short = run_backtest(candles[:cut], strategy, config(limits=RiskLimits(), close_at_end=False))
    full = run_backtest(candles, strategy, config(limits=RiskLimits(), close_at_end=False))
    assert full.equity_curve[: cut - 1] == short.equity_curve[: cut - 1]
    past = [t for t in full.trades if t.exit_time < candles[cut - 1].timestamp]
    assert past == [t for t in short.trades if t.exit_time < candles[cut - 1].timestamp]


def test_trade_start_skips_warmup_bars():
    candles = make_candles([100] * 10 + [101, 102, 103])
    strategy = ScriptedStrategy({2: Action.BUY, 10: Action.BUY})
    result = run_backtest(candles, strategy, config(), trade_start=8)
    assert all(t.entry_time >= candles[8].timestamp for t in result.trades)
    assert len(result.equity_curve) == 5


def test_risk_manager_can_veto_strategy():
    candles = make_candles([100, 101, 102, 103, 104])
    tiny = RiskLimits(min_order_value=1_000_000)  # aucun ordre ne peut passer
    result = run_backtest(candles, ScriptedStrategy({1: Action.BUY}), config(limits=tiny))
    assert result.trades == []
    [rejection] = result.rejections
    assert rejection["stage"] == "risk" and "minimum" in rejection["reasons"][0]


def test_drawdown_halt_stops_new_entries():
    closes = [100, 100, 100, 70, 70, 70, 70]
    candles = make_candles(closes)
    limits = RiskLimits(stop_loss_pct=50, take_profit_pct=500, max_position_pct=100,
                        risk_per_trade_pct=100, max_drawdown_pct=5, max_daily_loss_pct=90)
    result = run_backtest(candles, ScriptedStrategy({1: Action.BUY, 3: Action.SELL, 4: Action.BUY}),
                          config(limits=limits))
    assert len(result.trades) == 1
    assert any("drawdown" in e for e in result.risk_events)
    assert any("arrêté" in r for rej in result.rejections for r in rej["reasons"])


def test_invalid_trade_start():
    with pytest.raises(ValueError):
        run_backtest(make_candles([1, 2]), ScriptedStrategy(), config(), trade_start=5)
