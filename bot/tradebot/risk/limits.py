from __future__ import annotations

from dataclasses import dataclass

from ..config import Settings


@dataclass(frozen=True)
class RiskLimits:
    """Limites de risque, en pourcentages (1.0 = 1 %)."""

    risk_per_trade_pct: float = 1.0
    max_position_pct: float = 25.0
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0
    max_open_positions: int = 1
    max_daily_loss_pct: float = 3.0
    max_drawdown_pct: float = 15.0
    max_total_loss_pct: float = 20.0
    max_trades_per_day: int = 5
    min_order_value: float = 10.0
    max_price_deviation_pct: float = 2.0

    @classmethod
    def from_settings(cls, s: Settings) -> "RiskLimits":
        return cls(
            risk_per_trade_pct=s.risk_per_trade_pct,
            max_position_pct=s.max_position_pct,
            stop_loss_pct=s.stop_loss_pct,
            take_profit_pct=s.take_profit_pct,
            max_open_positions=s.max_open_positions,
            max_daily_loss_pct=s.max_daily_loss_pct,
            max_drawdown_pct=s.max_drawdown_pct,
            max_total_loss_pct=s.max_total_loss_pct,
            max_trades_per_day=s.max_trades_per_day,
            min_order_value=s.min_order_value,
            max_price_deviation_pct=s.max_price_deviation_pct,
        )
