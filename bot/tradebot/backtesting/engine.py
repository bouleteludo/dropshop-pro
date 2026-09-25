"""Moteur de backtest événementiel, bougie par bougie.

Ordre des opérations pour chaque bougie i (anti look-ahead) :

  1. OUVERTURE  : exécution de l'ordre décidé à la clôture de i-1, au prix
                  d'ouverture de i (+ spread, slippage, frais). Le risk
                  manager valide l'ordre avec les informations connues à cet
                  instant (prix d'ouverture, capital, positions).
  2. PENDANT    : stop-loss / take-profit via le plus bas / plus haut de i.
  3. CLÔTURE    : valorisation du portefeuille, limites de risque.
  4. DÉCISION   : signal calculé sur les bougies 0..i uniquement ; s'il y a
                  un ordre à passer, il sera exécuté à l'étape 1 de i+1.

Une décision prise à la clôture de i n'est donc jamais exécutée au prix de
clôture de i (prix déjà « consommé » par le calcul du signal).
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Optional, Sequence

from ..config import Settings
from ..data.models import Candle
from ..execution import CostModel, Order, OrderRequest, OrderSide, OrderStatus, PaperBroker
from ..portfolio import ClosedTrade, Portfolio
from ..risk import RiskLimits, RiskManager, RiskState
from ..risk.exits import exit_on_candle
from ..signals import Action, Signal
from ..strategies import Strategy
from .metrics import Metrics, compute_metrics


@dataclass(frozen=True)
class BacktestConfig:
    symbol: str
    timeframe: str
    initial_capital: float
    costs: CostModel = CostModel()
    limits: RiskLimits = RiskLimits()
    close_at_end: bool = True

    @classmethod
    def from_settings(cls, s: Settings, close_at_end: bool = True) -> "BacktestConfig":
        return cls(
            symbol=s.symbol,
            timeframe=s.timeframe,
            initial_capital=s.initial_capital,
            costs=CostModel.from_pct(s.fee_pct, s.slippage_pct, s.spread_pct),
            limits=RiskLimits.from_settings(s),
            close_at_end=close_at_end,
        )


@dataclass
class BacktestResult:
    strategy: str
    params: dict
    config: BacktestConfig
    equity_curve: list[tuple[int, float]]
    trades: list[ClosedTrade]
    orders: list[Order]
    rejections: list[dict]
    signal_counts: dict[str, int]
    metrics: Metrics
    start_ms: int
    end_ms: int
    risk_events: list[str] = field(default_factory=list)


def run_backtest(
    candles: Sequence[Candle],
    strategy: Strategy,
    config: BacktestConfig,
    *,
    trade_start: int = 0,
) -> BacktestResult:
    """`trade_start` : index de la première bougie tradée. Les bougies
    précédentes ne servent qu'à initialiser les indicateurs (warm-up)."""
    if not 0 <= trade_start < len(candles):
        raise ValueError(f"trade_start={trade_start} hors de l'historique ({len(candles)} bougies)")

    symbol = config.symbol
    signals = strategy.generate_signals(candles, symbol)
    portfolio = Portfolio(config.initial_capital)
    broker = PaperBroker(portfolio, config.costs)
    risk = RiskManager(
        config.limits, config.costs, config.initial_capital,
        RiskState.initial(config.initial_capital, candles[trade_start].timestamp),
    )

    equity_curve: list[tuple[int, float]] = []
    orders: list[Order] = []
    rejections: list[dict] = []
    risk_events: list[str] = []
    counts: Counter = Counter()
    exposure_bars = 0
    pending: Optional[Signal] = None

    def submit(side: OrderSide, quantity: float, reason: str, time: int, **levels) -> Optional[Order]:
        order = broker.place_order(OrderRequest(symbol, side, quantity, reason=reason, **levels))
        orders.append(order)
        if order.status is not OrderStatus.FILLED:
            rejections.append({"time": time, "side": side.value, "stage": "broker", "reasons": [order.reject_reason]})
            return None
        return order

    for i in range(trade_start, len(candles)):
        candle = candles[i]
        broker.update_price(symbol, candle.open, candle.timestamp)
        risk_events += risk.update(portfolio.equity({symbol: candle.open}), candle.timestamp)

        # 1. Exécution à l'ouverture de l'ordre décidé à la clôture précédente.
        if pending is not None:
            if pending.action is Action.BUY:
                decision = risk.evaluate_entry(
                    symbol=symbol,
                    price=candle.open,
                    reference_price=candles[i - 1].close if i else None,
                    equity=portfolio.equity({symbol: candle.open}),
                    cash=portfolio.cash,
                    positions=portfolio.positions,
                    open_orders=broker.open_orders(),
                )
                if not decision.approved:
                    rejections.append(
                        {"time": candle.timestamp, "side": "BUY", "stage": "risk", "reasons": decision.reasons}
                    )
                elif submit(
                    OrderSide.BUY, decision.quantity, pending.reason, candle.timestamp,
                    stop_loss=decision.stop_loss, take_profit=decision.take_profit,
                ):
                    risk.record_entry()
            else:
                decision = risk.evaluate_exit(symbol=symbol, price=candle.open, positions=portfolio.positions)
                if decision.approved:
                    submit(OrderSide.SELL, decision.quantity, pending.reason, candle.timestamp)
            pending = None

        # 2. Stop-loss / take-profit touchés pendant la bougie.
        position = portfolio.positions.get(symbol)
        if position is not None:
            hit = exit_on_candle(position, candle)
            if hit is not None:
                level, reason = hit
                broker.update_price(symbol, level, candle.timestamp)
                submit(OrderSide.SELL, position.quantity, reason, candle.timestamp)

        # 3. Clôture : valorisation et limites de risque.
        broker.update_price(symbol, candle.close, candle.timestamp)
        equity = portfolio.equity({symbol: candle.close})
        risk_events += risk.update(equity, candle.timestamp)
        equity_curve.append((candle.timestamp, equity))
        if symbol in portfolio.positions:
            exposure_bars += 1

        # 4. Décision à la clôture, exécutée à l'ouverture suivante.
        signal = signals[i]
        counts[signal.action.value] += 1
        in_position = symbol in portfolio.positions
        if (signal.action is Action.BUY and not in_position) or (signal.action is Action.SELL and in_position):
            pending = signal

    last = candles[-1]
    if config.close_at_end and symbol in portfolio.positions:
        submit(OrderSide.SELL, portfolio.positions[symbol].quantity, "fin du backtest", last.timestamp)
        equity_curve[-1] = (last.timestamp, portfolio.equity({symbol: last.close}))

    metrics = compute_metrics(
        equity_curve=equity_curve,
        trades=portfolio.closed_trades,
        initial_capital=config.initial_capital,
        timeframe=config.timeframe,
        exposure_bars=exposure_bars,
        total_bars=len(candles) - trade_start,
        total_fees=portfolio.fees_paid,
        first_price=candles[trade_start].open,
        last_price=last.close,
    )
    return BacktestResult(
        strategy=strategy.name,
        params=strategy.params(),
        config=config,
        equity_curve=equity_curve,
        trades=list(portfolio.closed_trades),
        orders=orders,
        rejections=rejections,
        signal_counts=dict(counts),
        metrics=metrics,
        start_ms=candles[trade_start].timestamp,
        end_ms=last.timestamp,
        risk_events=risk_events,
    )
