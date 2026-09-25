"""Format commun des signaux émis par toutes les stratégies."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Action(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass(frozen=True)
class Signal:
    """Intention de la stratégie. Ce n'est PAS un ordre : le gestionnaire de
    risque peut la refuser.

    `candle_timestamp` = ouverture de la bougie de décision ; la décision est
    prise à sa CLÔTURE, avec `price` = son prix de clôture.
    """

    action: Action
    symbol: str
    candle_timestamp: int
    price: float
    strategy: str
    reason: str
    indicators: dict[str, Optional[float]] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "action": self.action.value,
            "symbol": self.symbol,
            "candle_timestamp": self.candle_timestamp,
            "price": self.price,
            "strategy": self.strategy,
            "reason": self.reason,
            "indicators": self.indicators,
        }


__all__ = ["Action", "Signal"]
