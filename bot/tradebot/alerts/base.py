"""Alertes. V1 : LogNotifier (dans les logs). V2 : Telegram, Discord, email
via de nouvelles classes Notifier, avec leurs jetons lus depuis .env."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable


class AlertType(str, Enum):
    BOT_STARTED = "BOT_STARTED"
    BOT_STOPPED = "BOT_STOPPED"
    POSITION_OPENED = "POSITION_OPENED"
    POSITION_CLOSED = "POSITION_CLOSED"
    LARGE_LOSS = "LARGE_LOSS"
    RISK_HALT = "RISK_HALT"
    API_PROBLEM = "API_PROBLEM"
    API_RECOVERED = "API_RECOVERED"
    ERROR = "ERROR"


class AlertLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class AlertEvent:
    type: AlertType
    level: AlertLevel
    message: str
    data: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


class Notifier(ABC):
    name: str = "abstract"

    @abstractmethod
    def send(self, event: AlertEvent) -> None: ...


class LogNotifier(Notifier):
    name = "log"

    def __init__(self, logger: logging.Logger | None = None):
        self.log = logger or logging.getLogger("tradebot.alerts")

    def send(self, event: AlertEvent) -> None:
        level = {AlertLevel.INFO: logging.INFO, AlertLevel.WARNING: logging.WARNING}.get(event.level, logging.CRITICAL)
        self.log.log(level, "ALERT[%s] %s", event.type.value, event.message)


class AlertDispatcher:
    """Envoie chaque alerte à tous les canaux. Une panne d'un canal (Telegram
    injoignable…) est journalisée mais n'arrête jamais le bot."""

    def __init__(self, notifiers: Iterable[Notifier] = ()):
        self.notifiers = list(notifiers) or [LogNotifier()]
        self.log = logging.getLogger("tradebot.alerts")

    def send(self, type: AlertType, level: AlertLevel, message: str, **data) -> AlertEvent:
        event = AlertEvent(type, level, message, data)
        for notifier in self.notifiers:
            try:
                notifier.send(event)
            except Exception as exc:  # noqa: BLE001 — un canal d'alerte ne doit jamais faire tomber le bot
                self.log.error("échec de l'alerte via %s : %s", notifier.name, exc)
        return event
