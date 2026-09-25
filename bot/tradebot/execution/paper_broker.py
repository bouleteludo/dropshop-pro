from __future__ import annotations

import math
from collections import OrderedDict
from typing import Optional

from ..portfolio import Portfolio, Position
from .broker import BrokerInterface, OrderNotFoundError, PriceUnavailableError
from .costs import CostModel
from .models import Balance, Order, OrderRequest, OrderSide, OrderStatus, OrderType

MAX_ORDERS_KEPT = 500


class PaperBroker(BrokerInterface):
    """Broker simulé : exécute les ordres au marché sur le dernier prix connu,
    avec spread, slippage et frais. Aucun appel réseau, aucun argent réel.

    Utilisé à l'identique par le backtest et par le paper trading, ce qui
    rend leurs résultats comparables.
    """

    def __init__(self, portfolio: Portfolio, costs: CostModel):
        self.portfolio = portfolio
        self.costs = costs
        self._prices: dict[str, float] = {}
        self._time = 0
        self._orders: "OrderedDict[str, Order]" = OrderedDict()
        self._seq = 0

    # --- Prix -----------------------------------------------------------------
    def update_price(self, symbol: str, price: float, timestamp: int) -> None:
        self._prices[symbol] = price
        self._time = timestamp

    def get_price(self, symbol: str) -> float:
        price = self._prices.get(symbol)
        if price is None:
            raise PriceUnavailableError(f"aucun prix connu pour {symbol}")
        return price

    # --- Compte ---------------------------------------------------------------
    def get_balance(self) -> Balance:
        return Balance(cash=self.portfolio.cash, equity=self.portfolio.equity(self._prices))

    def get_positions(self) -> dict[str, Position]:
        return dict(self.portfolio.positions)

    # --- Ordres ---------------------------------------------------------------
    def place_order(self, request: OrderRequest) -> Order:
        # Contrôles AVANT d'enregistrer l'ordre : sinon il se verrait lui-même
        # comme « ordre déjà en attente ».
        rejection = self._check(request)
        self._seq += 1
        order = Order(
            id=f"paper-{self._time}-{self._seq}",
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            quantity=request.quantity,
            status=OrderStatus.NEW,
            created_at=self._time,
            reference_price=self._prices.get(request.symbol),
            reason=request.reason,
        )
        self._store(order)
        if rejection:
            order.status = OrderStatus.REJECTED
            order.reject_reason = rejection
            return order

        reference = self._prices[request.symbol]
        fill_price = self.costs.execution_price(request.side, reference)
        if request.side is OrderSide.BUY:
            fee = self.costs.fee(request.quantity * fill_price)
            self.portfolio.open_position(
                request.symbol, request.quantity, fill_price, fee, self._time,
                stop_loss=request.stop_loss, take_profit=request.take_profit,
            )
        else:
            fee = self.costs.fee(request.quantity * fill_price)
            self.portfolio.close_position(request.symbol, fill_price, fee, self._time, request.reason)

        order.status = OrderStatus.FILLED
        order.fill_price = fill_price
        order.filled_quantity = request.quantity
        order.fee = fee
        order.filled_at = self._time
        return order

    def _check(self, request: OrderRequest) -> Optional[str]:
        if request.order_type is not OrderType.MARKET:
            return f"type d'ordre non supporté : {request.order_type.value}"
        if not math.isfinite(request.quantity) or request.quantity <= 0:
            return f"quantité invalide : {request.quantity}"
        price = self._prices.get(request.symbol)
        if price is None or not math.isfinite(price) or price <= 0:
            return f"prix indisponible ou incohérent pour {request.symbol} : {price}"
        position = self.portfolio.positions.get(request.symbol)

        if request.side is OrderSide.BUY:
            if position is not None:
                return f"position déjà ouverte sur {request.symbol}"
            if any(o.symbol == request.symbol for o in self.open_orders()):
                return f"un ordre est déjà en attente sur {request.symbol}"
            fill = self.costs.execution_price(OrderSide.BUY, price)
            cost = request.quantity * fill + self.costs.fee(request.quantity * fill)
            if cost > self.portfolio.cash:
                return f"fonds insuffisants : {cost:.2f} requis, {self.portfolio.cash:.2f} disponibles"
            if request.stop_loss is not None and request.stop_loss >= fill:
                return f"stop-loss {request.stop_loss} au-dessus du prix d'entrée {fill:.2f}"
            if request.take_profit is not None and request.take_profit <= fill:
                return f"take-profit {request.take_profit} sous le prix d'entrée {fill:.2f}"
            return None

        if position is None:
            return f"aucune position connue sur {request.symbol}"
        if abs(request.quantity - position.quantity) > 1e-9 * max(1.0, position.quantity):
            return (
                f"quantité {request.quantity} différente de la position {position.quantity} "
                "(clôture partielle non supportée en V1)"
            )
        return None

    def cancel_order(self, order_id: str) -> bool:
        order = self._orders.get(order_id)
        if order is None:
            raise OrderNotFoundError(order_id)
        if order.status is not OrderStatus.NEW:
            return False
        order.status = OrderStatus.CANCELED
        return True

    def get_order_status(self, order_id: str) -> OrderStatus:
        order = self._orders.get(order_id)
        if order is None:
            raise OrderNotFoundError(order_id)
        return order.status

    def open_orders(self) -> list[Order]:
        return [o for o in self._orders.values() if o.status is OrderStatus.NEW]

    def recent_orders(self, n: int = 20) -> list[Order]:
        return list(self._orders.values())[-n:]

    def _store(self, order: Order) -> None:
        self._orders[order.id] = order
        while len(self._orders) > MAX_ORDERS_KEPT:
            self._orders.popitem(last=False)
