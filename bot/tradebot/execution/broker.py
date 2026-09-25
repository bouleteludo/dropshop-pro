from __future__ import annotations

from abc import ABC, abstractmethod

from ..portfolio import Position
from .models import Balance, Order, OrderRequest, OrderStatus


class BrokerError(RuntimeError):
    pass


class PriceUnavailableError(BrokerError):
    pass


class OrderNotFoundError(BrokerError):
    pass


class BrokerInterface(ABC):
    """Contrat commun au PaperBroker (V1) et au futur broker réel (V3).

    Un ordre refusé n'est pas une exception : place_order renvoie un Order
    au statut REJECTED avec la raison, pour que le refus soit journalisé.
    """

    @abstractmethod
    def get_balance(self) -> Balance: ...

    @abstractmethod
    def get_positions(self) -> dict[str, Position]: ...

    @abstractmethod
    def get_price(self, symbol: str) -> float: ...

    @abstractmethod
    def place_order(self, request: OrderRequest) -> Order: ...

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool: ...

    @abstractmethod
    def get_order_status(self, order_id: str) -> OrderStatus: ...

    @abstractmethod
    def open_orders(self) -> list[Order]: ...
