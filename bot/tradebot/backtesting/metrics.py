from __future__ import annotations

import math
import statistics
from dataclasses import asdict, dataclass, field
from typing import Optional, Sequence

from ..data.timeframes import bars_per_year
from ..portfolio import ClosedTrade

MIN_TRADES_FOR_SIGNIFICANCE = 30
MIN_DAYS_FOR_ANNUALIZATION = 90


@dataclass
class Metrics:
    initial_capital: float
    final_equity: float
    total_return_pct: float
    annualized_return_pct: Optional[float]
    buy_and_hold_pct: Optional[float]
    n_trades: int
    winners: int
    losers: int
    win_rate_pct: Optional[float]
    profit_factor: Optional[float]
    avg_win: Optional[float]
    avg_loss: Optional[float]
    expectancy: Optional[float]
    max_drawdown_pct: float
    sharpe: Optional[float]
    exposure_pct: float
    total_fees: float
    duration_days: float
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def max_drawdown_pct(equity: Sequence[float]) -> float:
    """Plus forte baisse, en %, depuis un plus haut de la courbe de capital."""
    peak = -math.inf
    worst = 0.0
    for value in equity:
        peak = max(peak, value)
        if peak > 0:
            worst = max(worst, (peak - value) / peak * 100)
    return worst


def sharpe_ratio(equity: Sequence[float], periods_per_year: float, min_periods: int = 30) -> Optional[float]:
    """Sharpe annualisé des rendements par bougie (taux sans risque = 0).
    None si l'échantillon est trop court ou sans variance."""
    returns = [equity[i] / equity[i - 1] - 1 for i in range(1, len(equity)) if equity[i - 1] > 0]
    if len(returns) < min_periods:
        return None
    std = statistics.pstdev(returns)
    if std == 0:
        return None
    return statistics.fmean(returns) / std * math.sqrt(periods_per_year)


def compute_metrics(
    *,
    equity_curve: Sequence[tuple[int, float]],
    trades: Sequence[ClosedTrade],
    initial_capital: float,
    timeframe: str,
    exposure_bars: int,
    total_bars: int,
    total_fees: float,
    first_price: Optional[float],
    last_price: Optional[float],
) -> Metrics:
    equity = [initial_capital] + [e for _, e in equity_curve]
    final = equity[-1]
    duration_days = (
        (equity_curve[-1][0] - equity_curve[0][0]) / 86_400_000 if len(equity_curve) > 1 else 0.0
    )
    total_return = (final / initial_capital - 1) * 100
    annualized = None
    if duration_days >= MIN_DAYS_FOR_ANNUALIZATION and final > 0:
        annualized = ((final / initial_capital) ** (365 / duration_days) - 1) * 100

    wins = [t.net_pnl for t in trades if t.net_pnl > 0]
    losses = [t.net_pnl for t in trades if t.net_pnl < 0]
    n = len(trades)
    gross_win, gross_loss = sum(wins), -sum(losses)

    metrics = Metrics(
        initial_capital=initial_capital,
        final_equity=final,
        total_return_pct=total_return,
        annualized_return_pct=annualized,
        buy_and_hold_pct=(last_price / first_price - 1) * 100 if first_price and last_price else None,
        n_trades=n,
        winners=len(wins),
        losers=len(losses),
        win_rate_pct=100 * len(wins) / n if n else None,
        profit_factor=gross_win / gross_loss if gross_loss > 0 else None,
        avg_win=statistics.fmean(wins) if wins else None,
        avg_loss=statistics.fmean(losses) if losses else None,
        expectancy=statistics.fmean(t.net_pnl for t in trades) if trades else None,
        max_drawdown_pct=max_drawdown_pct(equity),
        sharpe=sharpe_ratio(equity, bars_per_year(timeframe)),
        exposure_pct=100 * exposure_bars / total_bars if total_bars else 0.0,
        total_fees=total_fees,
        duration_days=duration_days,
    )
    metrics.warnings = _warnings(metrics)
    return metrics


def _warnings(m: Metrics) -> list[str]:
    w = []
    if m.n_trades == 0:
        w.append("Aucun trade : impossible d'évaluer la stratégie sur cette période.")
    elif m.n_trades < MIN_TRADES_FOR_SIGNIFICANCE:
        w.append(
            f"Seulement {m.n_trades} trades (< {MIN_TRADES_FOR_SIGNIFICANCE}) : "
            "échantillon statistiquement insuffisant pour conclure."
        )
    if m.duration_days < 180:
        w.append("Période courte (< 6 mois) : probablement un seul régime de marché testé.")
    if m.profit_factor is not None and m.profit_factor > 3 and m.n_trades < 50:
        w.append("Profit factor très élevé sur peu de trades : résultat suspect (chance ou sur-optimisation).")
    if m.profit_factor is None and m.winners > 0:
        w.append("Aucun trade perdant : résultat irréaliste, vérifier la période et les hypothèses.")
    if m.buy_and_hold_pct is not None and m.total_return_pct < m.buy_and_hold_pct:
        w.append(
            f"Moins bien que conserver l'actif (buy & hold {m.buy_and_hold_pct:+.2f}%) sur la même période."
        )
    return w
