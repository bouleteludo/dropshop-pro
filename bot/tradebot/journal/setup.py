from __future__ import annotations

import logging
import os
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Iterable, Mapping, Optional

SENSITIVE_MARKERS = ("KEY", "SECRET", "TOKEN", "PASSWORD", "PASSPHRASE", "PRIVATE")
MIN_SECRET_LENGTH = 6
MASK = "***"


def collect_secrets(env: Optional[Mapping[str, str]] = None) -> list[str]:
    """Valeurs des variables d'environnement qui ressemblent à des secrets."""
    env = os.environ if env is None else env
    return [
        value for name, value in env.items()
        if any(m in name.upper() for m in SENSITIVE_MARKERS) and len(value.strip()) >= MIN_SECRET_LENGTH
    ]


class RedactingFilter(logging.Filter):
    """Remplace toute valeur secrète par *** dans les messages ET les tracebacks
    (une exception réseau peut contenir une URL signée ou un en-tête)."""

    def __init__(self, secrets: Iterable[str]):
        super().__init__()
        self._secrets = sorted({s.strip() for s in secrets if len(s.strip()) >= MIN_SECRET_LENGTH}, key=len, reverse=True)

    def redact(self, text: str) -> str:
        for secret in self._secrets:
            text = text.replace(secret, MASK)
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        if not self._secrets:
            return True
        record.msg = self.redact(record.getMessage())
        record.args = None
        if record.exc_info:
            record.exc_text = self.redact(logging.Formatter().formatException(record.exc_info))
            record.exc_info = None
        return True


class UtcFormatter(logging.Formatter):
    converter = time.gmtime


def setup_logging(log_dir: Path, level: str = "INFO", secrets: Iterable[str] = ()) -> logging.Logger:
    """Logs console + fichier tournant logs/bot.log (5 x 5 Mo), horodatés en UTC."""
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("tradebot")
    logger.setLevel(level)
    logger.propagate = False
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()

    formatter = UtcFormatter("%(asctime)s UTC %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")
    redactor = RedactingFilter(secrets)
    handlers = [
        logging.StreamHandler(sys.stderr),
        RotatingFileHandler(log_dir / "bot.log", maxBytes=5_000_000, backupCount=5, encoding="utf-8"),
    ]
    for handler in handlers:
        handler.setFormatter(formatter)
        handler.addFilter(redactor)
        logger.addHandler(handler)
    return logger
