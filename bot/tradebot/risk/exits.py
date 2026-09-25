"""Déclenchement des stop-loss / take-profit, partagé par le backtest et le paper trading."""

from __future__ import annotations

from typing import Optional

from ..data.models import Candle
from ..portfolio import Position


def exit_on_price(position: Position, price: float) -> Optional[str]:
    """Temps réel : le dernier prix touche-t-il le stop ou l'objectif ?"""
    if position.stop_loss is not None and price <= position.stop_loss:
        return "stop-loss"
    if position.take_profit is not None and price >= position.take_profit:
        return "take-profit"
    return None


def exit_on_candle(position: Position, candle: Candle) -> Optional[tuple[float, str]]:
    """Backtest : niveau de sortie atteint pendant la bougie, et à quel prix.

    - Ouverture au-delà du niveau (gap) : sortie au prix d'ouverture, pas au
      niveau théorique (on ne peut pas vendre à un prix qui n'a pas existé).
    - Stop ET objectif touchés dans la même bougie : on ignore l'ordre réel
      des prix, donc on retient l'hypothèse pessimiste (stop-loss).
    """
    sl, tp = position.stop_loss, position.take_profit
    if sl is not None and candle.open <= sl:
        return candle.open, "stop-loss (gap à l'ouverture)"
    if tp is not None and candle.open >= tp:
        return candle.open, "take-profit (gap à l'ouverture)"
    if sl is not None and candle.low <= sl:
        return sl, "stop-loss"
    if tp is not None and candle.high >= tp:
        return tp, "take-profit"
    return None
