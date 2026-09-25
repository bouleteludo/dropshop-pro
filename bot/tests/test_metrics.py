import pytest

from tradebot.backtesting import compute_metrics, max_drawdown_pct, sharpe_ratio
from tradebot.portfolio import ClosedTrade

from .helpers import HOUR, T0


def trade(pnl):
    # prix de sortie choisi pour obtenir le P&L net voulu (sans frais)
    return ClosedTrade("X", 1, T0, T0 + HOUR, 100, 100 + pnl, 0, 0, "test")


def test_max_drawdown():
    assert max_drawdown_pct([100, 120, 90, 130, 117]) == pytest.approx(25)
    assert max_drawdown_pct([100, 110, 120]) == 0


def test_sharpe_requires_enough_varying_data():
    assert sharpe_ratio([100] * 50, 8760) is None
    assert sharpe_ratio([100, 101, 102], 8760) is None
    rising = [100.0]
    for i in range(100):
        rising.append(rising[-1] * (1.001 + (0.0005 if i % 2 else -0.0005)))
    assert sharpe_ratio(rising, 8760) > 0
    assert sharpe_ratio(list(reversed(rising)), 8760) < 0


def test_trade_statistics():
    trades = [trade(p) for p in (30, -10, 20, -20, 10)]
    curve = [(T0 + i * HOUR, 10_000 + 6 * i) for i in range(1, 6)]
    m = compute_metrics(
        equity_curve=curve, trades=trades, initial_capital=10_000, timeframe="1h",
        exposure_bars=2, total_bars=5, total_fees=3.5, first_price=100, last_price=110,
    )
    assert m.n_trades == 5 and m.winners == 3 and m.losers == 2
    assert m.win_rate_pct == pytest.approx(60)
    assert m.profit_factor == pytest.approx(60 / 30)
    assert m.avg_win == pytest.approx(20)
    assert m.avg_loss == pytest.approx(-15)
    assert m.expectancy == pytest.approx(6)
    assert m.total_return_pct == pytest.approx(0.3)
    assert m.buy_and_hold_pct == pytest.approx(10)
    assert m.exposure_pct == pytest.approx(40)
    assert m.total_fees == 3.5
    assert m.annualized_return_pct is None  # période trop courte pour annualiser
    assert any("statistiquement insuffisant" in w for w in m.warnings)
    assert any("buy & hold" in w for w in m.warnings)


def test_no_trade_warning_and_undefined_ratios():
    m = compute_metrics(
        equity_curve=[(T0, 10_000), (T0 + HOUR, 10_000)], trades=[], initial_capital=10_000,
        timeframe="1h", exposure_bars=0, total_bars=2, total_fees=0, first_price=1, last_price=1,
    )
    assert m.win_rate_pct is None and m.profit_factor is None and m.sharpe is None
    assert any("Aucun trade" in w for w in m.warnings)


def test_annualized_return_over_a_year():
    curve = [(T0, 10_000), (T0 + 365 * 24 * HOUR, 11_000)]
    m = compute_metrics(
        equity_curve=curve, trades=[], initial_capital=10_000, timeframe="1d",
        exposure_bars=0, total_bars=2, total_fees=0, first_price=1, last_price=1,
    )
    assert m.annualized_return_pct == pytest.approx(10)
