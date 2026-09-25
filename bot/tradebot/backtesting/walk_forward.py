"""Validation hors échantillon : train / validation / test et walk-forward.

Le but n'est PAS de trouver les paramètres au meilleur résultat historique,
mais de vérifier que des paramètres choisis sur une période restent
cohérents sur une période qu'ils n'ont jamais vue.
"""

from __future__ import annotations

import itertools
import math
import statistics
from dataclasses import dataclass, field
from typing import Callable, Optional, Sequence

from ..data.models import Candle
from ..strategies import Strategy
from .engine import BacktestConfig, run_backtest
from .metrics import Metrics

StrategyFactory = Callable[..., Strategy]

DEFAULT_GRID = {
    "fast": [10, 20, 30],
    "slow": [50, 100, 150],
    "rsi_period": [14],
    "rsi_overbought": [65, 70, 75],
}
# Les EMA dépendent de tout l'historique : on leur laisse plusieurs fois
# leur période pour converger avant chaque fenêtre testée.
WARMUP_MULTIPLIER = 3


def iter_grid(factory: StrategyFactory, grid: dict[str, list]) -> list[dict]:
    """Combinaisons valides de la grille (celles que la stratégie accepte)."""
    keys = list(grid)
    combos = []
    for values in itertools.product(*(grid[k] for k in keys)):
        params = dict(zip(keys, values))
        try:
            factory(**params)
        except ValueError:
            continue
        combos.append(params)
    if not combos:
        raise ValueError("aucune combinaison de paramètres valide dans la grille")
    return combos


def warmup_bars(factory: StrategyFactory, combos: Sequence[dict]) -> int:
    return WARMUP_MULTIPLIER * max(factory(**p).warmup for p in combos)


def score(metrics: Metrics, min_trades: int) -> float:
    """Critère d'optimisation : Sharpe, et seulement avec assez de trades."""
    if metrics.n_trades < min_trades or metrics.sharpe is None:
        return -math.inf
    return metrics.sharpe


def optimize(
    candles: Sequence[Candle],
    factory: StrategyFactory,
    combos: Sequence[dict],
    config: BacktestConfig,
    *,
    trade_start: int,
    min_trades: int,
) -> list[tuple[dict, Metrics]]:
    ranked = []
    for params in combos:
        result = run_backtest(candles, factory(**params), config, trade_start=trade_start)
        ranked.append((params, result.metrics))
    ranked.sort(key=lambda pm: score(pm[1], min_trades), reverse=True)
    return ranked


@dataclass
class Fold:
    index: int
    train_start: int
    train_end: int
    test_start: int
    test_end: int
    params: dict
    train: Metrics
    test: Metrics


@dataclass
class WalkForwardResult:
    folds: list[Fold]
    combos_tested: int
    oos_return_pct: float
    oos_trades: int
    oos_win_rate_pct: Optional[float]
    warnings: list[str] = field(default_factory=list)


def walk_forward(
    candles: Sequence[Candle],
    factory: StrategyFactory,
    grid: dict[str, list],
    config: BacktestConfig,
    *,
    train_bars: int,
    test_bars: int,
    min_trades: int = 5,
) -> WalkForwardResult:
    """Fenêtres glissantes : optimisation sur `train_bars`, évaluation sur les
    `test_bars` suivantes (jamais vues), puis décalage de `test_bars`."""
    combos = iter_grid(factory, grid)
    warmup = warmup_bars(factory, combos)
    folds: list[Fold] = []
    train_lo = warmup
    while train_lo + train_bars + test_bars <= len(candles):
        train_hi = train_lo + train_bars
        test_hi = train_hi + test_bars
        ranked = optimize(
            candles[train_lo - warmup : train_hi], factory, combos, config,
            trade_start=warmup, min_trades=min_trades,
        )
        params, train_metrics = ranked[0]
        test = run_backtest(candles[train_hi - warmup : test_hi], factory(**params), config, trade_start=warmup)
        folds.append(
            Fold(
                index=len(folds) + 1,
                train_start=candles[train_lo].timestamp,
                train_end=candles[train_hi - 1].timestamp,
                test_start=candles[train_hi].timestamp,
                test_end=candles[test_hi - 1].timestamp,
                params=params,
                train=train_metrics,
                test=test.metrics,
            )
        )
        train_lo += test_bars
    if not folds:
        raise ValueError(
            f"Historique trop court : il faut au moins {warmup + train_bars + test_bars} bougies "
            f"(warm-up {warmup} + train {train_bars} + test {test_bars}), reçu {len(candles)}."
        )

    growth = math.prod(1 + f.test.total_return_pct / 100 for f in folds)
    oos_trades = sum(f.test.n_trades for f in folds)
    oos_winners = sum(f.test.winners for f in folds)
    return WalkForwardResult(
        folds=folds,
        combos_tested=len(combos),
        oos_return_pct=(growth - 1) * 100,
        oos_trades=oos_trades,
        oos_win_rate_pct=100 * oos_winners / oos_trades if oos_trades else None,
        warnings=_overfitting_warnings(folds, grid, oos_trades),
    )


@dataclass
class SplitResult:
    params: dict
    combos_tested: int
    train: Metrics
    validation: Metrics
    test: Metrics
    warnings: list[str] = field(default_factory=list)


def train_validation_test(
    candles: Sequence[Candle],
    factory: StrategyFactory,
    grid: dict[str, list],
    config: BacktestConfig,
    *,
    ratios: tuple[float, float, float] = (0.6, 0.2, 0.2),
    top_k: int = 5,
    min_trades: int = 5,
) -> SplitResult:
    """Optimisation sur TRAIN, choix parmi les `top_k` meilleurs sur
    VALIDATION, puis UNE seule évaluation sur TEST (à ne pas ré-optimiser)."""
    if abs(sum(ratios) - 1) > 1e-9 or min(ratios) <= 0:
        raise ValueError("les ratios doivent être positifs et sommer à 1")
    combos = iter_grid(factory, grid)
    warmup = warmup_bars(factory, combos)
    usable = len(candles) - warmup
    if usable < 300:
        raise ValueError(f"Historique trop court : {len(candles)} bougies dont {warmup} de warm-up.")
    train_end = warmup + int(usable * ratios[0])
    val_end = train_end + int(usable * ratios[1])

    ranked = optimize(candles[:train_end], factory, combos, config, trade_start=warmup, min_trades=min_trades)
    best = None
    for params, train_metrics in ranked[:top_k]:
        val = run_backtest(candles[train_end - warmup : val_end], factory(**params), config, trade_start=warmup)
        if best is None or score(val.metrics, min_trades) > score(best[2], min_trades):
            best = (params, train_metrics, val.metrics)
    params, train_metrics, val_metrics = best
    test = run_backtest(candles[val_end - warmup :], factory(**params), config, trade_start=warmup).metrics

    warnings = []
    if train_metrics.total_return_pct > 0 and test.total_return_pct < 0:
        warnings.append("Rentable en TRAIN mais perdant en TEST : overfitting probable.")
    if train_metrics.sharpe and test.sharpe is not None and train_metrics.sharpe > 0:
        if test.sharpe < 0.5 * train_metrics.sharpe:
            warnings.append(
                f"Sharpe divisé par plus de 2 hors échantillon ({train_metrics.sharpe:.2f} → {test.sharpe:.2f}) : "
                "la performance d'entraînement est probablement sur-estimée."
            )
    warnings += _edge_warnings([params], grid)
    if test.n_trades < 30:
        warnings.append(f"Seulement {test.n_trades} trades en TEST : conclusion statistiquement fragile.")
    return SplitResult(params, len(combos), train_metrics, val_metrics, test, warnings)


def _overfitting_warnings(folds: Sequence[Fold], grid: dict[str, list], oos_trades: int) -> list[str]:
    warnings = []
    flipped = sum(1 for f in folds if f.train.total_return_pct > 0 and f.test.total_return_pct < 0)
    if flipped * 2 >= len(folds):
        warnings.append(
            f"{flipped}/{len(folds)} fenêtres rentables en entraînement mais perdantes hors échantillon : "
            "overfitting probable."
        )
    train_sharpes = [f.train.sharpe for f in folds if f.train.sharpe is not None]
    test_sharpes = [f.test.sharpe for f in folds if f.test.sharpe is not None]
    if train_sharpes and test_sharpes:
        is_mean, oos_mean = statistics.fmean(train_sharpes), statistics.fmean(test_sharpes)
        if is_mean > 0 and oos_mean < 0.5 * is_mean:
            warnings.append(
                f"Sharpe moyen {is_mean:.2f} en entraînement contre {oos_mean:.2f} hors échantillon : "
                "forte dégradation, les paramètres collent au passé."
            )
    distinct = {tuple(sorted(f.params.items())) for f in folds}
    if len(folds) >= 3 and len(distinct) * 2 > len(folds):
        warnings.append(
            f"Paramètres instables ({len(distinct)} jeux différents sur {len(folds)} fenêtres) : "
            "l'optimum dépend de la période, signe de bruit plutôt que de robustesse."
        )
    warnings += _edge_warnings([f.params for f in folds], grid)
    if oos_trades < 30:
        warnings.append(f"Seulement {oos_trades} trades hors échantillon : conclusion statistiquement fragile.")
    return warnings


def _edge_warnings(chosen: Sequence[dict], grid: dict[str, list]) -> list[str]:
    edges = [
        k for k, values in grid.items()
        if len(values) > 2 and sum(1 for p in chosen if p[k] in (min(values), max(values))) * 2 > len(chosen)
    ]
    if not edges:
        return []
    return [
        f"Optimum souvent au bord de la grille pour {', '.join(edges)} : "
        "le vrai optimum est peut-être hors de la plage testée, ou il n'y a pas d'optimum stable."
    ]
