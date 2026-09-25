from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .engine import BacktestResult
from .metrics import Metrics
from .walk_forward import SplitResult, WalkForwardResult

DISCLAIMER = (
    "Un backtest positif signifie seulement que la stratégie AURAIT produit ce résultat sur cet\n"
    "historique, avec ces hypothèses de frais/slippage/spread. Ce n'est pas une promesse de gain :\n"
    "liquidité, changement de régime de marché et risque d'exécution ne sont que partiellement modélisés."
)


def fmt_time(ts_ms: int) -> str:
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


def _pct(v: Optional[float]) -> str:
    return "n/a" if v is None else f"{v:+.2f}%"


def _num(v: Optional[float], fmt: str = "{:.2f}") -> str:
    return "n/a" if v is None else fmt.format(v)


def format_metrics(m: Metrics) -> list[str]:
    pf = _num(m.profit_factor) if m.profit_factor is not None else ("n/a (aucune perte)" if m.winners else "n/a")
    return [
        f"Capital initial        : {m.initial_capital:,.2f}",
        f"Capital final          : {m.final_equity:,.2f}",
        f"Rendement total        : {_pct(m.total_return_pct)}",
        f"Rendement annualisé    : {_pct(m.annualized_return_pct)}"
        + ("" if m.annualized_return_pct is not None else "  (période < 90 jours)"),
        f"Buy & hold (référence) : {_pct(m.buy_and_hold_pct)}",
        f"Nombre de trades       : {m.n_trades}  (gagnants {m.winners} / perdants {m.losers})",
        f"Taux de réussite       : {_num(m.win_rate_pct, '{:.1f}%')}",
        f"Profit factor          : {pf}",
        f"Gain moyen / perte moy.: {_num(m.avg_win)} / {_num(m.avg_loss)}",
        f"Espérance par trade    : {_num(m.expectancy)}",
        f"Drawdown maximal       : {m.max_drawdown_pct:.2f}%",
        f"Sharpe (annualisé)     : {_num(m.sharpe)}",
        f"Exposition             : {m.exposure_pct:.1f}% du temps en position",
        f"Frais totaux           : {m.total_fees:,.2f}",
        f"Durée                  : {m.duration_days:.0f} jours",
    ]


def format_backtest_report(result: BacktestResult, data_label: str) -> str:
    c = result.config
    lines = [
        "=" * 72,
        f"BACKTEST — {result.strategy} {result.params}",
        f"Données : {data_label} | {c.symbol} {c.timeframe} | {fmt_time(result.start_ms)} → {fmt_time(result.end_ms)}",
        f"Coûts   : frais {c.costs.fee_rate:.4%}, slippage {c.costs.slippage_rate:.4%}, spread {c.costs.spread_rate:.4%}",
        "=" * 72,
        *format_metrics(result.metrics),
        f"Signaux                : {result.signal_counts}",
        f"Refus (risque/broker)  : {len(result.rejections)}",
    ]
    if result.risk_events:
        lines.append("Événements de risque   :")
        lines += [f"  - {e}" for e in result.risk_events[:10]]
    if result.metrics.warnings:
        lines.append("")
        lines.append("AVERTISSEMENTS :")
        lines += [f"  ⚠ {w}" for w in result.metrics.warnings]
    lines += ["", DISCLAIMER]
    return "\n".join(lines)


def format_walk_forward(result: WalkForwardResult) -> str:
    lines = [
        "=" * 72,
        f"WALK-FORWARD — {len(result.folds)} fenêtres, {result.combos_tested} combinaisons testées par fenêtre",
        "=" * 72,
        f"{'#':>2}  {'fenêtre de test':<35} {'paramètres':<48} {'train':>9} {'test':>9} {'trades':>6}",
    ]
    for f in result.folds:
        params = ",".join(f"{k}={v}" for k, v in f.params.items())
        lines.append(
            f"{f.index:>2}  {fmt_time(f.test_start)} → {fmt_time(f.test_end):<16} {params:<48} "
            f"{f.train.total_return_pct:>+8.2f}% {f.test.total_return_pct:>+8.2f}% {f.test.n_trades:>6}"
        )
    lines += [
        "",
        f"Rendement hors échantillon (composé) : {_pct(result.oos_return_pct)}",
        f"Trades hors échantillon              : {result.oos_trades}",
        f"Taux de réussite hors échantillon    : {_num(result.oos_win_rate_pct, '{:.1f}%')}",
    ]
    lines += _warnings_block(result.warnings)
    lines += ["", "Seuls les résultats HORS ÉCHANTILLON (colonne test) comptent.", DISCLAIMER]
    return "\n".join(lines)


def format_split(result: SplitResult) -> str:
    lines = [
        "=" * 72,
        f"TRAIN / VALIDATION / TEST — {result.combos_tested} combinaisons testées",
        f"Paramètres retenus : {result.params}",
        "=" * 72,
    ]
    for label, m in (("TRAIN", result.train), ("VALIDATION", result.validation), ("TEST", result.test)):
        lines.append(
            f"{label:<11} rendement {_pct(m.total_return_pct):>9} | sharpe {_num(m.sharpe):>6} | "
            f"drawdown {m.max_drawdown_pct:5.2f}% | trades {m.n_trades}"
        )
    lines += _warnings_block(result.warnings)
    lines += ["", "Le résultat TEST est le seul non biaisé : ne ré-optimise pas en le regardant.", DISCLAIMER]
    return "\n".join(lines)


def _warnings_block(warnings: list[str]) -> list[str]:
    if not warnings:
        return ["", "Aucun signal d'overfitting détecté par les contrôles automatiques (ce n'est pas une preuve de robustesse)."]
    return ["", "AVERTISSEMENTS :"] + [f"  ⚠ {w}" for w in warnings]


def export_backtest(result: BacktestResult, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    trades_path = out_dir / "trades.csv"
    equity_path = out_dir / "equity.csv"
    with trades_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["entry_time", "exit_time", "quantity", "entry_price", "exit_price", "fees", "net_pnl", "return_pct", "exit_reason"]
        )
        for t in result.trades:
            writer.writerow(
                [fmt_time(t.entry_time), fmt_time(t.exit_time), f"{t.quantity:.8f}", f"{t.entry_price:.4f}",
                 f"{t.exit_price:.4f}", f"{t.fees:.4f}", f"{t.net_pnl:.4f}", f"{t.return_pct:.4f}", t.exit_reason]
            )
    with equity_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["time", "equity"])
        for ts, eq in result.equity_curve:
            writer.writerow([fmt_time(ts), f"{eq:.4f}"])
    return trades_path, equity_path
