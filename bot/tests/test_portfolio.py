import pytest

from tradebot.portfolio import Portfolio, PortfolioError


def test_open_close_and_pnl():
    p = Portfolio(1_000)
    p.open_position("X", 2, 100, 0.2, 1, stop_loss=95, take_profit=110)
    assert p.cash == pytest.approx(799.8)
    assert p.equity({"X": 105}) == pytest.approx(1_009.8)
    assert p.unrealized_pnl({"X": 105}) == pytest.approx(9.8)
    trade = p.close_position("X", 110, 0.22, 2, "take-profit")
    assert trade.gross_pnl == pytest.approx(20)
    assert trade.net_pnl == pytest.approx(20 - 0.42)
    assert trade.return_pct == pytest.approx(100 * (20 - 0.42) / 200.2)
    assert p.cash == pytest.approx(1_000 + trade.net_pnl)
    assert p.realized_pnl == pytest.approx(trade.net_pnl)
    assert p.fees_paid == pytest.approx(0.42)
    assert p.positions == {}


def test_portfolio_guards():
    p = Portfolio(100)
    with pytest.raises(PortfolioError):
        p.open_position("X", 2, 100, 0, 1)  # fonds insuffisants
    with pytest.raises(PortfolioError):
        p.close_position("X", 100, 0, 1, "?")  # position inconnue
    p.open_position("X", 0.5, 100, 0, 1)
    with pytest.raises(PortfolioError):
        p.open_position("X", 0.1, 100, 0, 1)  # doublon


def test_serialization_roundtrip():
    p = Portfolio(1_000)
    p.open_position("X", 1, 100, 0.1, 1, 95, 110)
    p.close_position("X", 105, 0.1, 2, "signal")
    p.open_position("X", 2, 100, 0.2, 3, 98, 104)
    restored = Portfolio.from_dict(p.to_dict())
    assert restored == p
