"""Boucle de paper trading : vrais prix, ordres simulés, aucun argent réel.

À chaque cycle (toutes les POLL_SECONDS secondes) :
  1. récupère les bougies et le dernier prix, valide les données ;
  2. met à jour le capital et les limites de risque ;
  3. surveille le stop-loss / take-profit de la position ouverte ;
  4. si une NOUVELLE bougie vient de se terminer : calcule le signal,
     le soumet au risk manager puis, si tout est validé et que
     ENABLE_TRADING=true, passe un ordre simulé ;
  5. sauvegarde l'état et le statut (monitoring).

La stratégie, le risk manager, le PaperBroker et le modèle de coûts sont
les mêmes que dans le backtest : les résultats sont comparables.
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass
from typing import Callable, Optional

from ..alerts import AlertDispatcher, AlertLevel, AlertType
from ..config import Settings
from ..data import (
    DataUnavailableError, MarketDataProvider, closed_candles, is_stale, timeframe_to_ms, validate_candles,
)
from ..execution import (
    CostModel, OrderRequest, OrderSide, OrderStatus, PaperBroker, ensure_live_trading_allowed,
)
from ..journal import (
    ACTION_NO_TRADE, ACTION_NONE, ACTION_ORDER_REJECTED, ACTION_PAPER_ORDER, ACTION_TRADING_DISABLED,
    DecisionJournal,
)
from ..monitoring import StatusTracker
from ..portfolio import Portfolio
from ..risk import KillSwitch, RiskLimits, RiskManager, RiskState
from ..risk.exits import exit_on_price
from ..signals import Action, Signal
from ..strategies import Strategy
from .state import StateError, StateStore, atomic_write_json


class KillSwitchEngagedError(RuntimeError):
    pass


@dataclass
class StepReport:
    new_candle: bool
    signal: Optional[Signal]
    action: Optional[str]
    price: Optional[float]
    duration_ms: float


class PaperTrader:
    def __init__(
        self,
        settings: Settings,
        provider: MarketDataProvider,
        strategy: Strategy,
        *,
        journal: DecisionJournal,
        alerts: AlertDispatcher,
        kill_switch: KillSwitch,
        store: StateStore,
        clock_ms: Callable[[], int] = lambda: int(time.time() * 1000),
        sleep: Callable[[float], None] = time.sleep,
        logger: Optional[logging.Logger] = None,
    ):
        if settings.mode != "paper":
            # Seul chemin vers le réel : le verrou, qui refuse tout en V1.
            ensure_live_trading_allowed(settings)
        self.s = settings
        self.provider = provider
        self.strategy = strategy
        self.journal = journal
        self.alerts = alerts
        self.kill_switch = kill_switch
        self.store = store
        self.clock_ms = clock_ms
        self.sleep = sleep
        self.log = logger or logging.getLogger("tradebot.paper")

        self.costs = CostModel.from_pct(settings.fee_pct, settings.slippage_pct, settings.spread_pct)
        self._tf_ms = timeframe_to_ms(settings.timeframe)
        self._restore_state()
        self.status = StatusTracker(
            mode=settings.mode, enable_trading=settings.enable_trading, exchange=settings.exchange,
            symbol=settings.symbol, timeframe=settings.timeframe, strategy=strategy.name,
            params=strategy.params(), poll_seconds=settings.poll_seconds,
        )
        self.price: Optional[float] = None
        self.consecutive_errors = 0
        self._stop_requested = False
        self.stop_reason = ""
        self._exit_warning_candle: Optional[int] = None

    # --- État persistant ------------------------------------------------------
    def _restore_state(self) -> None:
        s = self.s
        data = self.store.load()
        if data is None:
            portfolio = Portfolio(s.initial_capital)
            risk_state = RiskState.initial(s.initial_capital, self.clock_ms())
            self.last_candle_ts: Optional[int] = None
        else:
            expected = {"mode": s.mode, "exchange": s.exchange, "symbol": s.symbol, "timeframe": s.timeframe}
            found = {k: data.get(k) for k in expected}
            if found != expected:
                raise StateError(
                    f"L'état {self.store.path} correspond à {found}, la configuration à {expected}. "
                    "Refus de démarrer pour ne pas reprendre une position inconnue."
                )
            portfolio = Portfolio.from_dict(data["portfolio"])
            risk_state = RiskState.from_dict(data["risk"])
            self.last_candle_ts = data.get("last_candle_ts")
        self.portfolio = portfolio
        self.broker = PaperBroker(portfolio, self.costs)
        self.risk = RiskManager(RiskLimits.from_settings(s), self.costs, portfolio.initial_cash, risk_state)

    def _persist(self) -> None:
        s = self.s
        self.store.save({
            "mode": s.mode,
            "exchange": s.exchange,
            "symbol": s.symbol,
            "timeframe": s.timeframe,
            "strategy": self.strategy.name,
            "params": self.strategy.params(),
            "last_candle_ts": self.last_candle_ts,
            "portfolio": self.portfolio.to_dict(),
            "risk": self.risk.state.to_dict(),
        })

    def _write_status(self) -> None:
        snapshot = self.status.snapshot(
            now_ms=self.clock_ms(), portfolio=self.portfolio, risk=self.risk, price=self.price,
            last_candle_ts=self.last_candle_ts, kill_switch=self.kill_switch.engaged(),
        )
        atomic_write_json(self.s.status_file, snapshot)

    # --- Boucle ---------------------------------------------------------------
    def request_stop(self, reason: str) -> None:
        if not self._stop_requested:
            self._stop_requested = True
            self.stop_reason = reason

    def run(self, max_iterations: Optional[int] = None) -> str:
        if self.kill_switch.engaged():
            raise KillSwitchEngagedError(
                f"Kill switch engagé ({self.kill_switch.reason()}). "
                "Analyse la situation puis lance `python main.py resume` pour le lever."
            )
        self.status.state = "running"
        self.status.started_at = self.clock_ms()
        message = (
            f"{self.s.mode.upper()} {self.s.exchange} {self.s.symbol} {self.s.timeframe} {self.strategy!r} "
            f"ENABLE_TRADING={str(self.s.enable_trading).lower()} capital={self.portfolio.equity({}):.2f}"
        )
        self.journal.event("BOT_STARTED", message)
        self.alerts.send(AlertType.BOT_STARTED, AlertLevel.INFO, f"Bot démarré : {message}")
        if not self.s.enable_trading:
            self.log.warning("ENABLE_TRADING=false : le bot observe et journalise, AUCUN ordre (même simulé) ne sera passé.")

        iterations = 0
        try:
            while not self._stop_requested:
                if self.kill_switch.engaged():
                    self.request_stop(f"kill switch : {self.kill_switch.reason()}")
                    break
                try:
                    self.step()
                    self._on_success()
                except Exception as exc:  # noqa: BLE001 — toute erreur est journalisée et comptée
                    self._on_error(exc)
                    if self.consecutive_errors >= self.s.max_consecutive_errors:
                        self.request_stop(f"arrêt automatique après {self.consecutive_errors} erreurs consécutives")
                        break
                iterations += 1
                if max_iterations is not None and iterations >= max_iterations:
                    self.request_stop(f"{iterations} cycle(s) effectué(s)")
                    break
                self._interruptible_sleep(self.s.poll_seconds)
        except KeyboardInterrupt:
            self.request_stop("interruption clavier (Ctrl+C)")
        finally:
            self._shutdown()
        return self.stop_reason

    def _interruptible_sleep(self, seconds: float) -> None:
        """Attente découpée en tranches d'une seconde pour réagir vite au kill switch."""
        remaining = seconds
        while remaining > 0 and not self._stop_requested:
            if self.kill_switch.engaged():
                return
            chunk = min(1.0, remaining)
            self.sleep(chunk)
            remaining -= chunk

    def _shutdown(self) -> None:
        self.status.state = "stopped"
        self.status.stop_reason = self.stop_reason
        try:
            self._persist()
            self._write_status()
        except Exception:  # noqa: BLE001
            self.log.exception("échec de la sauvegarde de l'état à l'arrêt")
        position = self.portfolio.positions.get(self.s.symbol)
        note = ""
        if position is not None:
            note = (
                f" Position ouverte conservée ({position.quantity:.8g} {self.s.symbol}) : "
                "son stop-loss n'est plus surveillé tant que le bot est arrêté."
            )
        level = AlertLevel.INFO if "cycle" in self.stop_reason else AlertLevel.WARNING
        self.journal.event("BOT_STOPPED", f"{self.stop_reason}.{note}", logging.WARNING)
        self.alerts.send(AlertType.BOT_STOPPED, level, f"Bot arrêté : {self.stop_reason}.{note}")

    def _on_success(self) -> None:
        if self.consecutive_errors:
            self.journal.event("API_RECOVERED", f"reprise après {self.consecutive_errors} erreur(s)")
            self.alerts.send(AlertType.API_RECOVERED, AlertLevel.INFO, "Connexion aux données rétablie")
        self.consecutive_errors = 0
        self.status.consecutive_errors = 0

    def _on_error(self, exc: Exception) -> None:
        self.consecutive_errors += 1
        self.status.consecutive_errors = self.consecutive_errors
        message = f"{type(exc).__name__}: {exc}"
        self.status.errors.append(f"{self._now_label()} {message}")
        if isinstance(exc, DataUnavailableError):
            self.status.api_failed(message)
            self.log.warning("données indisponibles (%d/%d) : %s",
                             self.consecutive_errors, self.s.max_consecutive_errors, message)
            if self.consecutive_errors == 1:
                self.alerts.send(AlertType.API_PROBLEM, AlertLevel.WARNING, f"Problème API : {message}")
        else:
            self.log.exception("erreur inattendue pendant le cycle")
            self.alerts.send(AlertType.ERROR, AlertLevel.CRITICAL, f"Erreur : {message}")
        self.journal.error(message, consecutive=self.consecutive_errors)
        try:
            self._write_status()
        except Exception:  # noqa: BLE001
            self.log.exception("échec de l'écriture du statut")

    def _now_label(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(self.clock_ms() / 1000))

    # --- Un cycle ---------------------------------------------------------------
    def step(self) -> StepReport:
        t0 = time.perf_counter()
        s = self.s
        now = self.clock_ms()

        # +1 : la plateforme renvoie aussi la bougie en cours, qu'on retire.
        candles = self.provider.fetch_ohlcv(s.symbol, s.timeframe, limit=s.history_limit + 1)
        closed = closed_candles(candles, s.timeframe, now)
        if not closed:
            raise DataUnavailableError("aucune bougie terminée reçue")
        quote = self.provider.fetch_quote(s.symbol)
        self.status.api_ok(now)

        price = quote.last
        price_ok = isinstance(price, (int, float)) and math.isfinite(price) and price > 0
        problems = validate_candles(closed, s.timeframe).errors[:3]
        if is_stale(closed[-1], s.timeframe, now, s.max_data_staleness_bars):
            problems.append("dernière bougie terminée trop ancienne (flux interrompu ?)")
        if not price_ok:
            problems.append(f"prix du ticker incohérent : {price}")
        if len(closed) < self.strategy.warmup:
            problems.append(f"historique insuffisant ({len(closed)} < {self.strategy.warmup} bougies)")

        if price_ok:
            self.price = price
            self.broker.update_price(s.symbol, price, now)
        for event in self.risk.update(self.portfolio.equity({s.symbol: self.price} if self.price else {}), now):
            self.journal.event("RISK_LIMIT", event, logging.WARNING)
            self.alerts.send(AlertType.RISK_HALT, AlertLevel.CRITICAL, event)

        action = None
        # Stop-loss / take-profit : vérifiés à chaque cycle, pas seulement à la clôture.
        position = self.portfolio.positions.get(s.symbol)
        if position is not None and price_ok:
            reason = exit_on_price(position, price)
            if reason:
                action = self._exit(reason.upper().replace("-", "_"), reason, price, closed[-1].timestamp, t0)

        last = closed[-1]
        signal = None
        new_candle = self.last_candle_ts is None or last.timestamp > self.last_candle_ts
        if new_candle:
            signal = self.strategy.latest_signal(closed, s.symbol)
            self.status.signals.append(
                f"{self._now_label()} {signal.action.value} @ {signal.price:.8g} — {signal.reason}"
            )
            action = self._handle_signal(signal, price if price_ok else None, now, problems, t0)
            self.last_candle_ts = last.timestamp

        self._persist()
        self._write_status()
        return StepReport(new_candle, signal, action, self.price, (time.perf_counter() - t0) * 1000)

    def _handle_signal(self, signal: Signal, price: Optional[float], now: int, problems: list[str], t0: float) -> str:
        s = self.s
        in_position = s.symbol in self.portfolio.positions
        common = dict(
            mode=s.mode, symbol=s.symbol, timeframe=s.timeframe, strategy=signal.strategy,
            signal=signal.action.value, price=price, reason=signal.reason, indicators=signal.indicators,
            candle_timestamp=signal.candle_timestamp,
        )

        if signal.action is Action.HOLD:
            self.journal.decision(**common, action=ACTION_NONE, execution_ms=_ms(t0))
            return ACTION_NONE

        if signal.action is Action.SELL:
            if not in_position:
                self.journal.decision(**common, action=ACTION_NO_TRADE, note="aucune position à clôturer",
                                      execution_ms=_ms(t0))
                return ACTION_NO_TRADE
            return self._exit("SELL", signal.reason, price, signal.candle_timestamp, t0, signal)

        # BUY
        if in_position:
            self.journal.decision(**common, action=ACTION_NO_TRADE, note="déjà en position", execution_ms=_ms(t0))
            return ACTION_NO_TRADE
        entry_problems = list(problems)
        closed_at = signal.candle_timestamp + self._tf_ms
        max_age_ms = max(3 * s.poll_seconds, 120) * 1000
        if now - closed_at > max_age_ms:
            # Le backtest entre à l'ouverture qui suit la clôture : entrer bien
            # plus tard serait un autre trade, à un autre prix.
            entry_problems.append(f"signal trop ancien (bougie close depuis {(now - closed_at) / 1000:.0f}s)")
        decision = self.risk.evaluate_entry(
            symbol=s.symbol,
            price=price if price is not None else float("nan"),
            reference_price=signal.price,
            equity=self.portfolio.equity({s.symbol: price} if price else {}),
            cash=self.portfolio.cash,
            positions=self.portfolio.positions,
            open_orders=self.broker.open_orders(),
            data_problems=entry_problems,
        )
        if not decision.approved:
            self.journal.decision(**common, risk=decision, action=ACTION_NO_TRADE, execution_ms=_ms(t0))
            return ACTION_NO_TRADE
        if not s.enable_trading:
            self.journal.decision(**common, risk=decision, action=ACTION_TRADING_DISABLED,
                                  note="ENABLE_TRADING=false : ordre non envoyé", execution_ms=_ms(t0))
            return ACTION_TRADING_DISABLED

        order, latency = self._submit(OrderRequest(
            s.symbol, OrderSide.BUY, decision.quantity, stop_loss=decision.stop_loss,
            take_profit=decision.take_profit, reason=signal.reason,
        ))
        if order.status is not OrderStatus.FILLED:
            self.journal.decision(**common, risk=decision, action=ACTION_ORDER_REJECTED,
                                  note=order.reject_reason, execution_ms=_ms(t0))
            return ACTION_ORDER_REJECTED
        self.risk.record_entry()
        self.journal.decision(**common, risk=decision, action=ACTION_PAPER_ORDER, execution_ms=_ms(t0))
        self.alerts.send(
            AlertType.POSITION_OPENED, AlertLevel.INFO,
            f"Achat simulé {order.filled_quantity:.8g} {s.symbol} à {order.fill_price:.2f} "
            f"(stop {decision.stop_loss:.2f}, objectif {decision.take_profit:.2f})",
            order_id=order.id, latency_ms=latency,
        )
        return ACTION_PAPER_ORDER

    def _exit(self, label: str, reason: str, price: Optional[float], candle_ts: int, t0: float,
              signal: Optional[Signal] = None) -> str:
        s = self.s
        common = dict(
            mode=s.mode, symbol=s.symbol, timeframe=s.timeframe,
            strategy=signal.strategy if signal else "risk",
            signal=label, price=price, reason=reason,
            indicators=signal.indicators if signal else {}, candle_timestamp=candle_ts,
        )
        decision = self.risk.evaluate_exit(
            symbol=s.symbol, price=price if price is not None else float("nan"), positions=self.portfolio.positions,
        )
        if not decision.approved:
            self.journal.decision(**common, risk=decision, action=ACTION_NO_TRADE, execution_ms=_ms(t0))
            return ACTION_NO_TRADE
        if not s.enable_trading:
            # Stop/objectif revérifiés à chaque cycle : un seul avertissement
            # par bougie pour ne pas inonder les logs.
            if signal is not None or self._exit_warning_candle != candle_ts:
                self._exit_warning_candle = candle_ts
                self.journal.decision(**common, risk=decision, action=ACTION_TRADING_DISABLED,
                                      note="ENABLE_TRADING=false : position NON clôturée", execution_ms=_ms(t0))
            return ACTION_TRADING_DISABLED

        order, latency = self._submit(OrderRequest(s.symbol, OrderSide.SELL, decision.quantity, reason=reason))
        if order.status is not OrderStatus.FILLED:
            self.journal.decision(**common, risk=decision, action=ACTION_ORDER_REJECTED,
                                  note=order.reject_reason, execution_ms=_ms(t0))
            return ACTION_ORDER_REJECTED
        self.journal.decision(**common, risk=decision, action=ACTION_PAPER_ORDER, execution_ms=_ms(t0))
        trade = self.portfolio.closed_trades[-1]
        self.alerts.send(
            AlertType.POSITION_CLOSED, AlertLevel.INFO,
            f"Vente simulée {trade.quantity:.8g} {s.symbol} à {trade.exit_price:.2f} ({reason}) : "
            f"P&L net {trade.net_pnl:+.2f} ({trade.return_pct:+.2f}%)",
            order_id=order.id, latency_ms=latency,
        )
        equity = self.portfolio.equity({s.symbol: price})
        if trade.net_pnl < 0 and -trade.net_pnl >= equity * s.large_loss_alert_pct / 100:
            self.alerts.send(
                AlertType.LARGE_LOSS, AlertLevel.WARNING,
                f"Perte importante : {trade.net_pnl:+.2f} (>= {s.large_loss_alert_pct:g}% du capital)",
            )
        return ACTION_PAPER_ORDER

    def _submit(self, request: OrderRequest):
        t = time.perf_counter()
        order = self.broker.place_order(request)
        latency = (time.perf_counter() - t) * 1000
        self.journal.order(order, latency_ms=latency)
        self.status.orders.append(
            f"{self._now_label()} {order.side.value} {order.filled_quantity or order.quantity:.8g} "
            f"{order.status.value} @ {order.fill_price or '-'} {order.reject_reason}".rstrip()
        )
        return order, latency


def _ms(t0: float) -> float:
    return (time.perf_counter() - t0) * 1000
