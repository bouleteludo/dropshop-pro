"""Tableau de bord minimal : le bot écrit state/status.json à chaque cycle,
`python main.py status` l'affiche. Un dashboard web (V2) lira le même fichier."""

from __future__ import annotations

import json
import os
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..portfolio import Portfolio
from ..risk import RiskManager


def _iso(ts_ms: Optional[int]) -> Optional[str]:
    if ts_ms is None:
        return None
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


class StatusTracker:
    def __init__(self, *, mode: str, enable_trading: bool, exchange: str, symbol: str, timeframe: str,
                 strategy: str, params: dict, poll_seconds: int, max_items: int = 20):
        self.info = {
            "mode": mode, "enable_trading": enable_trading, "exchange": exchange, "symbol": symbol,
            "timeframe": timeframe, "strategy": strategy, "params": params, "poll_seconds": poll_seconds,
            "pid": os.getpid(),
        }
        self.state = "starting"
        self.stop_reason = ""
        self.started_at: Optional[int] = None
        self.api_status = "unknown"
        self.api_last_ok: Optional[int] = None
        self.api_last_error = ""
        self.consecutive_errors = 0
        self.signals: deque = deque(maxlen=max_items)
        self.orders: deque = deque(maxlen=max_items)
        self.errors: deque = deque(maxlen=max_items)

    def api_ok(self, now_ms: int) -> None:
        self.api_status = "ok"
        self.api_last_ok = now_ms

    def api_failed(self, message: str) -> None:
        self.api_status = "down"
        self.api_last_error = message

    def snapshot(self, *, now_ms: int, portfolio: Portfolio, risk: RiskManager, price: Optional[float],
                 last_candle_ts: Optional[int], kill_switch: bool) -> dict:
        symbol = self.info["symbol"]
        prices = {symbol: price} if price else {}
        equity = portfolio.equity(prices)
        total_pnl = equity - portfolio.initial_cash
        return {
            "bot": {
                "state": self.state,
                "stop_reason": self.stop_reason,
                "started_at": _iso(self.started_at),
                "heartbeat": _iso(now_ms),
                "heartbeat_ms": now_ms,
                "kill_switch": kill_switch,
                **self.info,
            },
            "market": {"last_price": price, "last_closed_candle": _iso(last_candle_ts)},
            "account": {
                "initial_capital": portfolio.initial_cash,
                "cash": portfolio.cash,
                "equity": equity,
                "realized_pnl": portfolio.realized_pnl,
                "unrealized_pnl": portfolio.unrealized_pnl(prices),
                "total_pnl": total_pnl,
                "total_pnl_pct": 100 * total_pnl / portfolio.initial_cash,
                "fees_paid": portfolio.fees_paid,
                "closed_trades": len(portfolio.closed_trades),
                "drawdown_pct": risk.drawdown_pct(equity),
                "daily_loss_pct": risk.daily_loss_pct(equity),
            },
            "positions": [
                {**vars(p), "opened_at": _iso(p.opened_at), "unrealized_pnl": p.unrealized_pnl(prices.get(s, p.entry_price))}
                for s, p in portfolio.positions.items()
            ],
            "risk": risk.state.to_dict(),
            "api": {
                "status": self.api_status,
                "last_ok": _iso(self.api_last_ok),
                "last_error": self.api_last_error,
                "consecutive_errors": self.consecutive_errors,
            },
            "last_signals": list(self.signals),
            "last_orders": list(self.orders),
            "last_errors": list(self.errors),
        }


def _price(value: Optional[float]) -> str:
    return "-" if value is None else f"{value:.2f}"


def read_status(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def format_status(status: Optional[dict], now_ms: int) -> str:
    if status is None:
        return "Aucun statut : le bot n'a jamais été lancé (python main.py run)."
    bot, acc, api, risk = status["bot"], status["account"], status["api"], status["risk"]
    state = bot["state"].upper()
    if bot["state"] == "running":
        age_s = (now_ms - bot["heartbeat_ms"]) / 1000
        if age_s > 3 * bot["poll_seconds"] + 60:
            state = f"INACTIF — aucun signe de vie depuis {age_s:.0f}s (processus arrêté ou planté ?)"
        else:
            state = "ACTIF"
    lines = [
        f"Bot            : {state}" + (f" ({bot['stop_reason']})" if bot["stop_reason"] else ""),
        f"Mode           : {bot['mode'].upper()} | ENABLE_TRADING={str(bot['enable_trading']).lower()}"
        + (" | KILL SWITCH ENGAGÉ" if bot["kill_switch"] else ""),
        f"Marché         : {bot['exchange']} {bot['symbol']} {bot['timeframe']} | {bot['strategy']} {bot['params']}",
        f"Dernier signe  : {bot['heartbeat']} | prix {status['market']['last_price']} | "
        f"bougie {status['market']['last_closed_candle']}",
        f"API            : {api['status']} (dernier succès {api['last_ok']})"
        + (f" | erreur : {api['last_error']}" if api["status"] != "ok" and api["last_error"] else ""),
        f"Capital        : {acc['equity']:,.2f} (cash {acc['cash']:,.2f}, initial {acc['initial_capital']:,.2f})",
        f"P&L            : total {acc['total_pnl']:+,.2f} ({acc['total_pnl_pct']:+.2f}%) | "
        f"réalisé {acc['realized_pnl']:+,.2f} | latent {acc['unrealized_pnl']:+,.2f} | frais {acc['fees_paid']:,.2f}",
        f"Drawdown       : {acc['drawdown_pct']:.2f}% | perte du jour {acc['daily_loss_pct']:.2f}% | "
        f"trades clôturés {acc['closed_trades']}",
        "Risque         : "
        + ("ARRÊTÉ — " + risk["halt_reason"] if risk["halted"] else "OK")
        + (" | entrées bloquées pour la journée" if risk["day_blocked"] else "")
        + f" | trades aujourd'hui {risk['trades_today']}",
    ]
    if status["positions"]:
        lines.append("Positions      :")
        for p in status["positions"]:
            lines.append(
                f"  {p['symbol']} qty={p['quantity']:.8g} entrée={p['entry_price']:.2f} "
                f"stop={_price(p['stop_loss'])} objectif={_price(p['take_profit'])} "
                f"latent={p['unrealized_pnl']:+.2f} (ouverte {p['opened_at']})"
            )
    else:
        lines.append("Positions      : aucune")
    for title, key in (("Derniers signaux", "last_signals"), ("Derniers ordres", "last_orders"), ("Dernières erreurs", "last_errors")):
        items = status[key][-5:]
        lines.append(f"{title} :" + ("" if items else " aucun"))
        lines += [f"  {item}" for item in items]
    return "\n".join(lines)
