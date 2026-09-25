from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Mapping, Optional, Sequence

from ..execution.costs import CostModel
from ..execution.models import Order, OrderSide
from ..portfolio import Position
from .limits import RiskLimits
from .sizing import position_size


def utc_day(ts_ms: int) -> str:
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


@dataclass
class RiskState:
    peak_equity: float
    day: str
    day_start_equity: float
    trades_today: int = 0
    # Perte journalière dépassée : nouvelles entrées bloquées jusqu'au lendemain (UTC).
    day_blocked: bool = False
    # Drawdown / perte globale / anomalie : arrêt VERROUILLÉ, levée manuelle
    # uniquement (commande `reset-halt`) après analyse.
    halted: bool = False
    halt_reason: str = ""

    @classmethod
    def initial(cls, equity: float, now_ms: int) -> "RiskState":
        return cls(peak_equity=equity, day=utc_day(now_ms), day_start_equity=equity)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "RiskState":
        return cls(**data)


@dataclass
class RiskDecision:
    approved: bool
    side: OrderSide
    reasons: list[str] = field(default_factory=list)
    quantity: float = 0.0
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    notional: float = 0.0
    risk_amount: float = 0.0
    limited_by: str = ""

    @property
    def verdict(self) -> str:
        return "PASS" if self.approved else "REJECT"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["side"] = self.side.value
        d["verdict"] = self.verdict
        return d


class RiskManager:
    """Indépendant de la stratégie : il peut refuser n'importe quel signal.

    STRATEGY = BUY  →  RISK MANAGER = REJECT  →  FINAL ACTION = NO TRADE

    Les sorties (vente d'une position connue) restent autorisées même quand
    le bot est arrêté par le risque : elles réduisent l'exposition.
    """

    def __init__(self, limits: RiskLimits, costs: CostModel, initial_capital: float, state: RiskState):
        self.limits = limits
        self.costs = costs
        self.initial_capital = initial_capital
        self.state = state

    # --- Suivi du capital -------------------------------------------------------
    def drawdown_pct(self, equity: float) -> float:
        peak = self.state.peak_equity
        return max(0.0, (peak - equity) / peak * 100) if peak > 0 else 0.0

    def daily_loss_pct(self, equity: float) -> float:
        start = self.state.day_start_equity
        return max(0.0, (start - equity) / start * 100) if start > 0 else 0.0

    def update(self, equity: float, now_ms: int) -> list[str]:
        """Met à jour pic, journée et limites. Renvoie les nouveaux blocages."""
        s = self.state
        events = []
        day = utc_day(now_ms)
        if day != s.day:
            s.day, s.day_start_equity, s.trades_today, s.day_blocked = day, equity, 0, False
        s.peak_equity = max(s.peak_equity, equity)

        if not s.halted:
            drawdown = self.drawdown_pct(equity)
            total_loss = max(0.0, (self.initial_capital - equity) / self.initial_capital * 100)
            if drawdown >= self.limits.max_drawdown_pct:
                events.append(self.halt(f"drawdown {drawdown:.2f}% >= limite {self.limits.max_drawdown_pct:g}%"))
            elif total_loss >= self.limits.max_total_loss_pct:
                events.append(self.halt(f"perte globale {total_loss:.2f}% >= limite {self.limits.max_total_loss_pct:g}%"))
        if not s.day_blocked:
            daily = self.daily_loss_pct(equity)
            if daily >= self.limits.max_daily_loss_pct:
                s.day_blocked = True
                events.append(
                    f"perte journalière {daily:.2f}% >= limite {self.limits.max_daily_loss_pct:g}% : "
                    "nouvelles entrées bloquées jusqu'à demain (UTC)"
                )
        return events

    def halt(self, reason: str) -> str:
        self.state.halted = True
        self.state.halt_reason = reason
        return f"ARRÊT DU TRADING : {reason}"

    def reset_halt(self) -> None:
        self.state.halted = False
        self.state.halt_reason = ""

    def record_entry(self) -> None:
        self.state.trades_today += 1

    # --- Décisions -------------------------------------------------------------
    def evaluate_entry(
        self,
        *,
        symbol: str,
        price: float,
        reference_price: Optional[float],
        equity: float,
        cash: float,
        positions: Mapping[str, Position],
        open_orders: Sequence[Order] = (),
        data_problems: Sequence[str] = (),
    ) -> RiskDecision:
        s, lim = self.state, self.limits
        reasons = []
        if s.halted:
            reasons.append(f"trading arrêté par le risk manager ({s.halt_reason})")
        if s.day_blocked:
            reasons.append(f"perte journalière max ({lim.max_daily_loss_pct:g}%) atteinte aujourd'hui")
        reasons.extend(f"données : {p}" for p in data_problems)
        if not _valid_price(price):
            reasons.append(f"prix incohérent : {price}")
        elif _valid_price(reference_price):
            deviation = abs(price / reference_price - 1) * 100
            if deviation > lim.max_price_deviation_pct:
                reasons.append(
                    f"écart de {deviation:.2f}% entre le prix actuel et la dernière clôture "
                    f"(max {lim.max_price_deviation_pct:g}%)"
                )
        if symbol in positions:
            reasons.append(f"position déjà ouverte sur {symbol}")
        if any(o.symbol == symbol for o in open_orders):
            reasons.append(f"ordre déjà en attente sur {symbol}")
        if len(positions) >= lim.max_open_positions:
            reasons.append(f"nombre max de positions atteint ({lim.max_open_positions})")
        if s.trades_today >= lim.max_trades_per_day:
            reasons.append(f"nombre max de trades par jour atteint ({lim.max_trades_per_day})")
        if not math.isfinite(equity) or equity <= 0:
            reasons.append(f"capital incohérent : {equity}")
        if reasons:
            return RiskDecision(False, OrderSide.BUY, reasons)

        entry = self.costs.execution_price(OrderSide.BUY, price)
        stop = entry * (1 - lim.stop_loss_pct / 100)
        take = entry * (1 + lim.take_profit_pct / 100)
        sizing = position_size(
            equity=equity,
            cash=cash,
            entry_price=entry,
            stop_price=stop,
            risk_per_trade_pct=lim.risk_per_trade_pct,
            max_position_pct=lim.max_position_pct,
            fee_rate=self.costs.fee_rate,
        )
        decision = RiskDecision(
            approved=True,
            side=OrderSide.BUY,
            quantity=sizing.quantity,
            entry_price=entry,
            stop_loss=stop,
            take_profit=take,
            notional=sizing.notional,
            risk_amount=sizing.risk_amount,
            limited_by=sizing.limited_by,
        )
        if sizing.notional < lim.min_order_value:
            decision.approved = False
            decision.reasons.append(
                f"taille calculée {sizing.notional:.2f} < minimum {lim.min_order_value:g} "
                f"(limitée par : {sizing.limited_by})"
            )
        return decision

    def evaluate_exit(self, *, symbol: str, price: float, positions: Mapping[str, Position]) -> RiskDecision:
        reasons = []
        position = positions.get(symbol)
        if position is None:
            reasons.append(f"aucune position connue sur {symbol}")
        if not _valid_price(price):
            reasons.append(f"prix incohérent : {price}")
        if reasons:
            return RiskDecision(False, OrderSide.SELL, reasons)
        return RiskDecision(
            approved=True,
            side=OrderSide.SELL,
            quantity=position.quantity,
            entry_price=self.costs.execution_price(OrderSide.SELL, price),
            notional=position.quantity * price,
        )


def _valid_price(price) -> bool:
    return isinstance(price, (int, float)) and math.isfinite(price) and price > 0
