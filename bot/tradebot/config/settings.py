"""Configuration du bot, lue depuis les variables d'environnement (fichier .env).

Les valeurs par défaut sont volontairement prudentes : paper trading,
ENABLE_TRADING=false, aucun ordre réel possible.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Mapping

MODES = ("paper", "live")
TRUE_VALUES = ("1", "true", "yes", "oui", "on")
FALSE_VALUES = ("0", "false", "no", "non", "off")


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Settings:
    # --- Mode -------------------------------------------------------------
    # paper = ordres simulés sur les vrais prix. live = argent réel (non
    # implémenté en V1, verrouillé par execution.live_guard).
    mode: str = "paper"
    # Interrupteur global : false = le bot observe et journalise mais
    # n'envoie AUCUN ordre, même simulé.
    enable_trading: bool = False
    live_trading_confirmation: str = ""

    # --- Marché -----------------------------------------------------------
    exchange: str = "binance"
    symbol: str = "BTC/USDT"
    timeframe: str = "1h"

    # --- Capital et coûts (pourcentages : 0.1 = 0,1 %) -------------------
    initial_capital: float = 10_000.0
    fee_pct: float = 0.1
    slippage_pct: float = 0.05
    spread_pct: float = 0.02

    # --- Risque -----------------------------------------------------------
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
    max_data_staleness_bars: int = 2
    large_loss_alert_pct: float = 2.0

    # --- Stratégie --------------------------------------------------------
    strategy: str = "ema_cross_rsi"
    ema_fast: int = 20
    ema_slow: int = 50
    rsi_period: int = 14
    rsi_overbought: float = 70.0

    # --- Boucle temps réel ------------------------------------------------
    poll_seconds: int = 60
    history_limit: int = 500
    max_consecutive_errors: int = 5

    # --- Fichiers ---------------------------------------------------------
    state_dir: Path = Path("state")
    log_dir: Path = Path("logs")
    log_level: str = "INFO"

    # --- Secrets (V3 uniquement, jamais affichés) ------------------------
    api_key: str = field(default="", repr=False)
    api_secret: str = field(default="", repr=False)

    @property
    def fee_rate(self) -> float:
        return self.fee_pct / 100

    @property
    def state_file(self) -> Path:
        # Un fichier par mode/plateforme/paire : une position simulée ne peut
        # jamais être reprise par un bot en argent réel.
        pair = self.symbol.replace("/", "-")
        return self.state_dir / f"{self.mode}_{self.exchange}_{pair}.json"

    @property
    def status_file(self) -> Path:
        return self.state_dir / "status.json"

    @property
    def kill_switch_file(self) -> Path:
        return self.state_dir / "KILL_SWITCH"

    def strategy_params(self) -> dict:
        return {
            "fast": self.ema_fast,
            "slow": self.ema_slow,
            "rsi_period": self.rsi_period,
            "rsi_overbought": self.rsi_overbought,
        }

    def public_view(self) -> dict:
        """Configuration affichable : les secrets sont masqués."""
        view = {}
        for f in fields(self):
            value = getattr(self, f.name)
            if f.name in ("api_key", "api_secret", "live_trading_confirmation"):
                value = "***" if value else ""
            view[f.name] = str(value) if isinstance(value, Path) else value
        return view

    def validate(self) -> None:
        errors = []
        if self.mode not in MODES:
            errors.append(f"MODE doit valoir {' ou '.join(MODES)} (reçu : {self.mode!r})")
        if "/" not in self.symbol:
            errors.append(f"SYMBOL doit être de la forme BASE/QUOTE, ex. BTC/USDT (reçu : {self.symbol!r})")
        for name in (
            "initial_capital", "risk_per_trade_pct", "max_position_pct", "stop_loss_pct",
            "take_profit_pct", "max_daily_loss_pct", "max_drawdown_pct", "max_total_loss_pct",
            "min_order_value", "max_price_deviation_pct", "large_loss_alert_pct",
        ):
            value = getattr(self, name)
            if not math.isfinite(value) or value <= 0:
                errors.append(f"{name.upper()} doit être strictement positif")
        for name in ("fee_pct", "slippage_pct", "spread_pct"):
            value = getattr(self, name)
            if not math.isfinite(value) or not 0 <= value < 10:
                errors.append(f"{name.upper()} doit être compris entre 0 et 10")
        for name in (
            "risk_per_trade_pct", "max_position_pct", "stop_loss_pct",
            "max_daily_loss_pct", "max_drawdown_pct", "max_total_loss_pct",
        ):
            if getattr(self, name) > 100:
                errors.append(f"{name.upper()} ne peut pas dépasser 100")
        if self.stop_loss_pct >= 100:
            errors.append("STOP_LOSS_PCT doit être inférieur à 100")
        for name in (
            "max_open_positions", "max_trades_per_day", "poll_seconds",
            "max_consecutive_errors", "max_data_staleness_bars",
        ):
            if getattr(self, name) < 1:
                errors.append(f"{name.upper()} doit être >= 1")
        if not 1 <= self.ema_fast < self.ema_slow:
            errors.append("EMA_FAST doit être >= 1 et strictement inférieur à EMA_SLOW")
        if self.rsi_period < 2:
            errors.append("RSI_PERIOD doit être >= 2")
        if not 0 < self.rsi_overbought <= 100:
            errors.append("RSI_OVERBOUGHT doit être compris entre 0 et 100")
        if self.history_limit < self.ema_slow * 3:
            errors.append("HISTORY_LIMIT doit valoir au moins 3 x EMA_SLOW pour stabiliser les indicateurs")
        if errors:
            raise ConfigError("Configuration invalide :\n  - " + "\n  - ".join(errors))


def _bool(env: Mapping[str, str], name: str, default: bool) -> bool:
    raw = env.get(name, "").strip().lower()
    if not raw:
        return default
    if raw in TRUE_VALUES:
        return True
    if raw in FALSE_VALUES:
        return False
    raise ConfigError(f"{name} doit valoir true ou false (reçu : {raw!r})")


def _num(env: Mapping[str, str], name: str, default, cast=float):
    raw = env.get(name, "").strip()
    if not raw:
        return default
    try:
        return cast(raw)
    except ValueError:
        raise ConfigError(f"{name} doit être un nombre (reçu : {raw!r})") from None


def _str(env: Mapping[str, str], name: str, default: str) -> str:
    return env.get(name, "").strip() or default


def load_settings(env: Mapping[str, str] | None = None, base_dir: Path | None = None) -> Settings:
    """Construit et valide les Settings. `base_dir` sert à résoudre les
    chemins relatifs (state/, logs/) pour que le bot se lance de n'importe où."""
    env = os.environ if env is None else env
    d = Settings()

    def path(name: str, default: Path) -> Path:
        p = Path(_str(env, name, str(default)))
        return base_dir / p if base_dir and not p.is_absolute() else p

    settings = Settings(
        mode=_str(env, "MODE", d.mode).lower(),
        enable_trading=_bool(env, "ENABLE_TRADING", d.enable_trading),
        live_trading_confirmation=env.get("LIVE_TRADING_CONFIRMATION", "").strip(),
        exchange=_str(env, "EXCHANGE", d.exchange).lower(),
        symbol=_str(env, "SYMBOL", d.symbol).upper(),
        timeframe=_str(env, "TIMEFRAME", d.timeframe),
        initial_capital=_num(env, "INITIAL_CAPITAL", d.initial_capital),
        fee_pct=_num(env, "FEE_PCT", d.fee_pct),
        slippage_pct=_num(env, "SLIPPAGE_PCT", d.slippage_pct),
        spread_pct=_num(env, "SPREAD_PCT", d.spread_pct),
        risk_per_trade_pct=_num(env, "RISK_PER_TRADE_PCT", d.risk_per_trade_pct),
        max_position_pct=_num(env, "MAX_POSITION_PCT", d.max_position_pct),
        stop_loss_pct=_num(env, "STOP_LOSS_PCT", d.stop_loss_pct),
        take_profit_pct=_num(env, "TAKE_PROFIT_PCT", d.take_profit_pct),
        max_open_positions=_num(env, "MAX_OPEN_POSITIONS", d.max_open_positions, int),
        max_daily_loss_pct=_num(env, "MAX_DAILY_LOSS_PCT", d.max_daily_loss_pct),
        max_drawdown_pct=_num(env, "MAX_DRAWDOWN_PCT", d.max_drawdown_pct),
        max_total_loss_pct=_num(env, "MAX_TOTAL_LOSS_PCT", d.max_total_loss_pct),
        max_trades_per_day=_num(env, "MAX_TRADES_PER_DAY", d.max_trades_per_day, int),
        min_order_value=_num(env, "MIN_ORDER_VALUE", d.min_order_value),
        max_price_deviation_pct=_num(env, "MAX_PRICE_DEVIATION_PCT", d.max_price_deviation_pct),
        max_data_staleness_bars=_num(env, "MAX_DATA_STALENESS_BARS", d.max_data_staleness_bars, int),
        large_loss_alert_pct=_num(env, "LARGE_LOSS_ALERT_PCT", d.large_loss_alert_pct),
        strategy=_str(env, "STRATEGY", d.strategy).lower(),
        ema_fast=_num(env, "EMA_FAST", d.ema_fast, int),
        ema_slow=_num(env, "EMA_SLOW", d.ema_slow, int),
        rsi_period=_num(env, "RSI_PERIOD", d.rsi_period, int),
        rsi_overbought=_num(env, "RSI_OVERBOUGHT", d.rsi_overbought),
        poll_seconds=_num(env, "POLL_SECONDS", d.poll_seconds, int),
        history_limit=_num(env, "HISTORY_LIMIT", d.history_limit, int),
        max_consecutive_errors=_num(env, "MAX_CONSECUTIVE_ERRORS", d.max_consecutive_errors, int),
        state_dir=path("STATE_DIR", d.state_dir),
        log_dir=path("LOG_DIR", d.log_dir),
        log_level=_str(env, "LOG_LEVEL", d.log_level).upper(),
        api_key=env.get("EXCHANGE_API_KEY", "").strip(),
        api_secret=env.get("EXCHANGE_API_SECRET", "").strip(),
    )
    settings.validate()
    return settings
