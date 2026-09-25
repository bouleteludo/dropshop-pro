import math

import pytest

from tradebot.execution import (
    CostModel, OrderNotFoundError, OrderRequest, OrderSide, OrderStatus, PaperBroker, PriceUnavailableError,
)
from tradebot.portfolio import Portfolio

COSTS = CostModel(fee_rate=0.001, slippage_rate=0.0005, spread_rate=0.0002)


def broker_at(price=100.0, cash=10_000.0, costs=COSTS):
    broker = PaperBroker(Portfolio(cash), costs)
    broker.update_price("BTC/USDT", price, 1_000)
    return broker


def buy(broker, qty, **kw):
    return broker.place_order(OrderRequest("BTC/USDT", OrderSide.BUY, qty, **kw))


def sell(broker, qty, reason="test"):
    return broker.place_order(OrderRequest("BTC/USDT", OrderSide.SELL, qty, reason=reason))


def test_cost_model_spread_and_slippage_are_adverse():
    # impact = spread/2 + slippage = 0.0001 + 0.0005
    assert COSTS.execution_price(OrderSide.BUY, 100) == pytest.approx(100.06)
    assert COSTS.execution_price(OrderSide.SELL, 100) == pytest.approx(99.94)
    assert COSTS.fee(1000) == pytest.approx(1.0)
    assert CostModel.from_pct(0.1, 0.05, 0.02) == COSTS


def test_buy_fills_with_costs_and_debits_cash():
    broker = broker_at()
    order = buy(broker, 10)
    assert order.status is OrderStatus.FILLED
    assert order.fill_price == pytest.approx(100.06)
    assert order.fee == pytest.approx(10 * 100.06 * 0.001)
    assert broker.portfolio.cash == pytest.approx(10_000 - 10 * 100.06 - order.fee)
    assert broker.get_positions()["BTC/USDT"].entry_price == pytest.approx(100.06)
    # Régression : un ordre valide ne doit pas se voir lui-même « en attente ».
    assert broker.open_orders() == []


def test_round_trip_pnl_includes_fees_spread_and_slippage():
    broker = broker_at()
    buy(broker, 10)
    broker.update_price("BTC/USDT", 110.0, 2_000)
    order = sell(broker, 10, reason="take-profit")
    trade = broker.portfolio.closed_trades[-1]
    entry, exit_ = 100.06, 110 * (1 - 0.0006)
    fees = 10 * entry * 0.001 + 10 * exit_ * 0.001
    assert order.fill_price == pytest.approx(exit_)
    assert trade.net_pnl == pytest.approx((exit_ - entry) * 10 - fees)
    assert trade.exit_reason == "take-profit"
    assert broker.portfolio.cash == pytest.approx(10_000 + trade.net_pnl)
    assert broker.portfolio.fees_paid == pytest.approx(fees)


def test_flat_round_trip_loses_exactly_the_costs():
    broker = broker_at()
    buy(broker, 10)
    sell(broker, 10)
    trade = broker.portfolio.closed_trades[-1]
    assert trade.net_pnl < 0
    expected = -(10 * 100 * 0.0006 * 2) - trade.fees
    assert trade.net_pnl == pytest.approx(expected)


def test_zero_cost_model_is_neutral():
    broker = broker_at(costs=CostModel(0, 0, 0))
    buy(broker, 10)
    sell(broker, 10)
    assert broker.portfolio.cash == pytest.approx(10_000)


@pytest.mark.parametrize("qty", [0, -1, math.nan, math.inf])
def test_rejects_invalid_quantity(qty):
    order = buy(broker_at(), qty)
    assert order.status is OrderStatus.REJECTED and "quantité" in order.reject_reason


def test_rejects_without_price():
    broker = PaperBroker(Portfolio(1000), COSTS)
    order = buy(broker, 1)
    assert order.status is OrderStatus.REJECTED and "prix" in order.reject_reason
    with pytest.raises(PriceUnavailableError):
        broker.get_price("BTC/USDT")


def test_rejects_insufficient_funds():
    order = buy(broker_at(cash=500), 10)
    assert order.status is OrderStatus.REJECTED and "fonds insuffisants" in order.reject_reason


def test_rejects_duplicate_position():
    broker = broker_at()
    buy(broker, 1)
    order = buy(broker, 1)
    assert order.status is OrderStatus.REJECTED and "déjà ouverte" in order.reject_reason


def test_rejects_sell_of_unknown_position():
    order = sell(broker_at(), 1)
    assert order.status is OrderStatus.REJECTED and "aucune position" in order.reject_reason


def test_rejects_partial_close():
    broker = broker_at()
    buy(broker, 2)
    order = sell(broker, 1)
    assert order.status is OrderStatus.REJECTED and "partielle" in order.reject_reason


def test_rejects_inconsistent_stop_and_target():
    assert "stop-loss" in buy(broker_at(), 1, stop_loss=150).reject_reason
    assert "take-profit" in buy(broker_at(), 1, take_profit=50).reject_reason


def test_order_status_and_cancel():
    broker = broker_at()
    order = buy(broker, 1)
    assert broker.get_order_status(order.id) is OrderStatus.FILLED
    assert broker.cancel_order(order.id) is False  # déjà exécuté
    with pytest.raises(OrderNotFoundError):
        broker.cancel_order("inconnu")
    with pytest.raises(OrderNotFoundError):
        broker.get_order_status("inconnu")


def test_balance_marks_to_market():
    broker = broker_at(costs=CostModel(0, 0, 0))
    buy(broker, 10)
    broker.update_price("BTC/USDT", 120, 2_000)
    balance = broker.get_balance()
    assert balance.cash == pytest.approx(9_000)
    assert balance.equity == pytest.approx(10_200)
