from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"


class OrderStatus(str, Enum):
    NEW = "NEW"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"


@dataclass(frozen=True)
class OrderRequest:
    symbol: str
    side: OrderSide
    quantity: float
    order_type: OrderType = OrderType.MARKET
    # Rattachés à la position ouverte. Un broker réel (V3) devra les poser
    # côté plateforme pour qu'ils restent actifs si le bot s'arrête.
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reason: str = ""


@dataclass
class Order:
    id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    status: OrderStatus
    created_at: int
    reference_price: Optional[float] = None
    fill_price: Optional[float] = None
    filled_quantity: float = 0.0
    fee: float = 0.0
    filled_at: Optional[int] = None
    reject_reason: str = ""
    reason: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "side": self.side.value,
            "type": self.order_type.value,
            "quantity": self.quantity,
            "status": self.status.value,
            "created_at": self.created_at,
            "reference_price": self.reference_price,
            "fill_price": self.fill_price,
            "filled_quantity": self.filled_quantity,
            "fee": self.fee,
            "filled_at": self.filled_at,
            "reject_reason": self.reject_reason,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class Balance:
    cash: float
    equity: float
