from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from ..data.models import Candle
from ..signals import Signal


class Strategy(ABC):
    """Interface de toutes les stratégies.

    Une stratégie est une HYPOTHÈSE à tester, pas une garantie de gain. Elle
    ne connaît ni le capital ni les positions : elle émet BUY / SELL / HOLD
    et le gestionnaire de risque décide.

    Contrat anti look-ahead (vérifié par les tests pour chaque stratégie du
    registre) : signals[i] ne dépend que de candles[:i+1], c'est-à-dire
    generate_signals(candles)[i] == generate_signals(candles[:i+1])[-1].
    """

    name: str = "abstract"

    @property
    @abstractmethod
    def warmup(self) -> int:
        """Nombre de bougies nécessaires avant le premier signal possible."""

    @abstractmethod
    def generate_signals(self, candles: Sequence[Candle], symbol: str) -> list[Signal]:
        """Un signal par bougie terminée, dans le même ordre que `candles`."""

    @abstractmethod
    def params(self) -> dict:
        """Paramètres actuels (journalisés avec chaque décision)."""

    def latest_signal(self, candles: Sequence[Candle], symbol: str) -> Signal:
        if not candles:
            raise ValueError("aucune bougie pour calculer un signal")
        return self.generate_signals(candles, symbol)[-1]

    def __repr__(self) -> str:
        return f"{self.name}({', '.join(f'{k}={v}' for k, v in self.params().items())})"
