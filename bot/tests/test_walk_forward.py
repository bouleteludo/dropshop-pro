import pytest

from tradebot.backtesting import BacktestConfig, train_validation_test, walk_forward
from tradebot.backtesting.metrics import Metrics
from tradebot.backtesting.walk_forward import Fold, _overfitting_warnings, iter_grid
from tradebot.data import generate_candles
from tradebot.strategies import EmaCrossRsiStrategy

GRID = {"fast": [5, 10, 60], "slow": [30, 50], "rsi_period": [14], "rsi_overbought": [70]}
CONFIG = BacktestConfig("BTC/USDT", "1h", 10_000)


def test_grid_skips_invalid_combinations():
    combos = iter_grid(EmaCrossRsiStrategy, GRID)
    assert {"fast": 60, "slow": 30, "rsi_period": 14, "rsi_overbought": 70} not in combos
    assert len(combos) == 4


def test_walk_forward_windows_never_overlap():
    candles = generate_candles(2600, seed=21)
    result = walk_forward(candles, EmaCrossRsiStrategy, GRID, CONFIG, train_bars=800, test_bars=400, min_trades=1)
    assert len(result.folds) == 4
    for fold in result.folds:
        assert fold.train_start < fold.train_end < fold.test_start <= fold.test_end
        assert fold.params in iter_grid(EmaCrossRsiStrategy, GRID)
    for a, b in zip(result.folds, result.folds[1:]):
        assert b.test_start > a.test_end  # fenêtres de test successives et disjointes
    growth = 1.0
    for fold in result.folds:
        growth *= 1 + fold.test.total_return_pct / 100
    assert result.oos_return_pct == pytest.approx((growth - 1) * 100)
    assert result.oos_trades == sum(f.test.n_trades for f in result.folds)


def test_walk_forward_needs_enough_history():
    with pytest.raises(ValueError, match="trop court"):
        walk_forward(generate_candles(500), EmaCrossRsiStrategy, GRID, CONFIG, train_bars=800, test_bars=400)


def test_train_validation_test_split():
    candles = generate_candles(3000, seed=4)
    result = train_validation_test(candles, EmaCrossRsiStrategy, GRID, CONFIG, min_trades=1)
    assert result.params in iter_grid(EmaCrossRsiStrategy, GRID)
    assert result.combos_tested == 4


def _metrics(ret, sharpe, trades=40):
    return Metrics(10_000, 10_000 * (1 + ret / 100), ret, None, None, trades, trades // 2, trades // 2,
                   50.0, 1.0, 1.0, -1.0, 0.0, 5.0, sharpe, 50.0, 10.0, 100.0)


def test_overfitting_is_flagged():
    grid = {"fast": [5, 10, 20], "slow": [50]}
    folds = [
        Fold(i, 0, 1, 2, 3, {"fast": fast, "slow": 50}, _metrics(15, 2.5), _metrics(-4, -0.8, trades=5))
        for i, fast in enumerate([5, 20, 5, 20], start=1)
    ]
    warnings = " ".join(_overfitting_warnings(folds, grid, oos_trades=20))
    assert "overfitting probable" in warnings
    assert "forte dégradation" in warnings
    assert "bord de la grille" in warnings
    assert "hors échantillon" in warnings


def test_consistent_results_raise_no_overfitting_flag():
    grid = {"fast": [5, 10, 20], "slow": [50]}
    folds = [Fold(i, 0, 1, 2, 3, {"fast": 10, "slow": 50}, _metrics(5, 1.0), _metrics(4, 0.9)) for i in range(1, 5)]
    assert _overfitting_warnings(folds, grid, oos_trades=160) == []
