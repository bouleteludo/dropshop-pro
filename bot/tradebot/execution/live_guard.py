"""Verrou du trading réel.

En V1, AUCUN broker réel n'existe dans le code : même avec toutes les
variables activées, ensure_live_trading_allowed() refuse. Le broker réel
(V3) ne sera branché qu'après validation du backtest et du paper trading,
derrière ce même verrou.
"""

from __future__ import annotations

from ..config import Settings

LIVE_CONFIRMATION_PHRASE = "JE_COMPRENDS_QUE_JE_PEUX_PERDRE_DE_L_ARGENT"
LIVE_BROKER_IMPLEMENTED = False


class LiveTradingDisabledError(RuntimeError):
    pass


def live_trading_blockers(settings: Settings) -> list[str]:
    blockers = []
    if settings.mode != "live":
        blockers.append("MODE n'est pas 'live'")
    if not settings.enable_trading:
        blockers.append("ENABLE_TRADING n'est pas 'true'")
    if settings.live_trading_confirmation != LIVE_CONFIRMATION_PHRASE:
        blockers.append(f"LIVE_TRADING_CONFIRMATION doit valoir exactement {LIVE_CONFIRMATION_PHRASE}")
    if not (settings.api_key and settings.api_secret):
        blockers.append("EXCHANGE_API_KEY / EXCHANGE_API_SECRET absents")
    if not LIVE_BROKER_IMPLEMENTED:
        blockers.append("aucun broker réel n'est implémenté en V1 (prévu en V3, après validation)")
    return blockers


def ensure_live_trading_allowed(settings: Settings) -> None:
    blockers = live_trading_blockers(settings)
    if blockers:
        raise LiveTradingDisabledError(
            "Trading réel refusé :\n  - " + "\n  - ".join(blockers)
        )
