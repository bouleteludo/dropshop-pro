from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

T = TypeVar("T")
log = logging.getLogger("tradebot.data")


def retry_call(
    fn: Callable[[], T],
    *,
    retry_on: tuple[type[BaseException], ...],
    max_retries: int = 4,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    sleep: Callable[[float], None] = time.sleep,
    description: str = "appel API",
) -> T:
    """Exécute `fn` en réessayant sur les erreurs transitoires (réseau, rate
    limit) avec un délai exponentiel : 1s, 2s, 4s, 8s…

    Les autres exceptions remontent immédiatement : réessayer une erreur
    permanente (symbole inconnu, requête invalide) ne sert à rien.
    """
    attempt = 0
    while True:
        try:
            return fn()
        except retry_on as exc:
            if attempt >= max_retries:
                raise
            delay = min(base_delay * 2**attempt, max_delay)
            attempt += 1
            log.warning(
                "%s en échec (%s: %s) — nouvelle tentative %d/%d dans %.1fs",
                description, type(exc).__name__, exc, attempt, max_retries, delay,
            )
            sleep(delay)
