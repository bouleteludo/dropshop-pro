from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..execution.models import Order
from ..risk.manager import RiskDecision

# Actions finales possibles d'une décision.
ACTION_NONE = "NONE"                    # signal HOLD
ACTION_NO_TRADE = "NO_TRADE"            # refusé (risque, données, déjà en position…)
ACTION_TRADING_DISABLED = "TRADING_DISABLED"  # validé mais ENABLE_TRADING=false
ACTION_PAPER_ORDER = "PAPER_ORDER"      # ordre simulé exécuté
ACTION_ORDER_REJECTED = "ORDER_REJECTED"  # refusé par le broker


def _fmt(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.8g}"
    return str(value)


class DecisionJournal:
    """Trace de chaque décision, pour comprendre après coup pourquoi le bot a
    agi ou refusé d'agir.

    - logs/decisions.jsonl : une ligne JSON par événement (analyse, jq, pandas)
    - logs/bot.log         : la même décision en une ligne lisible KEY=VALUE
    """

    def __init__(self, path: Path, logger: Optional[logging.Logger] = None):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.log = logger or logging.getLogger("tradebot.journal")

    def write(self, kind: str, **fields) -> dict:
        record = {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"), "kind": kind, **fields}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
        return record

    def decision(
        self,
        *,
        mode: str,
        symbol: str,
        timeframe: str,
        strategy: str,
        signal: str,
        price: Optional[float],
        reason: str,
        indicators: Optional[dict] = None,
        risk: Optional[RiskDecision] = None,
        action: str,
        candle_timestamp: Optional[int] = None,
        execution_ms: Optional[float] = None,
        note: str = "",
    ) -> dict:
        record = self.write(
            "decision",
            mode=mode,
            symbol=symbol,
            timeframe=timeframe,
            strategy=strategy,
            signal=signal,
            price=price,
            reason=reason,
            indicators=indicators or {},
            risk=risk.to_dict() if risk else None,
            action=action,
            candle_timestamp=candle_timestamp,
            execution_ms=execution_ms,
            note=note,
        )
        parts = [
            f"MODE={mode.upper()}",
            f"ASSET={symbol}",
            f"TIMEFRAME={timeframe}",
            f"STRATEGY={strategy}",
            f"SIGNAL={signal}",
            f"PRICE={_fmt(price)}",
        ]
        parts += [f"{k.upper()}={_fmt(v)}" for k, v in (indicators or {}).items()]
        if risk is not None:
            parts += [
                f"ENTRY={_fmt(risk.entry_price)}",
                f"STOP={_fmt(risk.stop_loss)}",
                f"TAKE_PROFIT={_fmt(risk.take_profit)}",
                f"POSITION_SIZE={_fmt(risk.quantity)}",
                f"NOTIONAL={_fmt(risk.notional)}",
                f"RISK_CHECK={risk.verdict}",
            ]
            if risk.reasons:
                parts.append(f"RISK_REASONS=\"{' ; '.join(risk.reasons)}\"")
        else:
            parts.append("RISK_CHECK=N/A")
        parts.append(f"ACTION={action}")
        parts.append(f"REASON=\"{reason}\"")
        if note:
            parts.append(f"NOTE=\"{note}\"")
        if execution_ms is not None:
            parts.append(f"EXEC_MS={execution_ms:.0f}")
        level = logging.WARNING if action in (ACTION_ORDER_REJECTED,) else logging.INFO
        self.log.log(level, "DECISION " + " ".join(parts))
        return record

    def order(self, order: Order, latency_ms: Optional[float] = None) -> dict:
        record = self.write("order", latency_ms=latency_ms, **order.to_dict())
        self.log.info(
            "ORDER id=%s side=%s qty=%s status=%s fill=%s fee=%s reason=\"%s\"%s",
            order.id, order.side.value, _fmt(order.quantity), order.status.value,
            _fmt(order.fill_price), _fmt(order.fee), order.reason or order.reject_reason,
            f" latency_ms={latency_ms:.1f}" if latency_ms is not None else "",
        )
        return record

    def event(self, name: str, message: str, level: int = logging.INFO, **fields) -> dict:
        record = self.write("event", name=name, message=message, **fields)
        self.log.log(level, "%s %s", name, message)
        return record

    def error(self, message: str, **fields) -> dict:
        record = self.write("error", message=message, **fields)
        self.log.error("ERROR %s", message)
        return record
