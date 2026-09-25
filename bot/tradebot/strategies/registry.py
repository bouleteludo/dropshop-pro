from __future__ import annotations

from .base import Strategy
from .ema_cross_rsi import EmaCrossRsiStrategy

# Pour ajouter une stratégie : créer une classe qui hérite de Strategy, puis
# l'enregistrer ici. Les tests anti look-ahead s'appliquent automatiquement à
# toutes les stratégies de ce registre.
STRATEGIES: dict[str, type[Strategy]] = {
    EmaCrossRsiStrategy.name: EmaCrossRsiStrategy,
}


def create_strategy(name: str, **params) -> Strategy:
    try:
        cls = STRATEGIES[name]
    except KeyError:
        raise ValueError(f"Stratégie inconnue : {name!r}. Disponibles : {', '.join(STRATEGIES)}") from None
    return cls(**params)
