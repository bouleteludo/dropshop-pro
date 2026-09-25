from __future__ import annotations

from typing import Sequence

from ..data.models import Candle
from ..indicators import crossed_above, crossed_below, ema, rsi
from ..signals import Action, Signal
from .base import Strategy


class EmaCrossRsiStrategy(Strategy):
    """Croisement de moyennes mobiles exponentielles filtré par le RSI (long uniquement).

    - BUY  : l'EMA rapide croise au-dessus de l'EMA lente ET le RSI est sous
             le seuil de surachat (évite d'acheter après une envolée).
    - SELL : l'EMA rapide croise en dessous de l'EMA lente.
    - HOLD : sinon.
    """

    name = "ema_cross_rsi"

    def __init__(self, fast: int = 20, slow: int = 50, rsi_period: int = 14, rsi_overbought: float = 70.0):
        if not 1 <= fast < slow:
            raise ValueError("il faut 1 <= fast < slow")
        if rsi_period < 2:
            raise ValueError("rsi_period doit être >= 2")
        self.fast = fast
        self.slow = slow
        self.rsi_period = rsi_period
        self.rsi_overbought = rsi_overbought

    @property
    def warmup(self) -> int:
        # L'EMA lente existe à partir de l'index slow-1 et un croisement compare
        # la bougie précédente à la courante : il faut slow+1 bougies. Le RSI
        # existe à partir de l'index rsi_period : il faut rsi_period+1 bougies.
        return max(self.slow, self.rsi_period) + 1

    def params(self) -> dict:
        return {
            "fast": self.fast,
            "slow": self.slow,
            "rsi_period": self.rsi_period,
            "rsi_overbought": self.rsi_overbought,
        }

    def generate_signals(self, candles: Sequence[Candle], symbol: str) -> list[Signal]:
        closes = [c.close for c in candles]
        fast = ema(closes, self.fast)
        slow = ema(closes, self.slow)
        rsi_values = rsi(closes, self.rsi_period)

        signals = []
        for i, candle in enumerate(candles):
            indicators = {
                f"EMA_FAST({self.fast})": _round(fast[i]),
                f"EMA_SLOW({self.slow})": _round(slow[i]),
                f"RSI({self.rsi_period})": _round(rsi_values[i]),
            }
            action, reason = self._decide(fast, slow, rsi_values, i)
            signals.append(
                Signal(
                    action=action,
                    symbol=symbol,
                    candle_timestamp=candle.timestamp,
                    price=candle.close,
                    strategy=self.name,
                    reason=reason,
                    indicators=indicators,
                )
            )
        return signals

    def _decide(self, fast, slow, rsi_values, i) -> tuple[Action, str]:
        if i < 1 or None in (fast[i - 1], slow[i - 1], rsi_values[i]):
            return Action.HOLD, "historique insuffisant"
        if crossed_above(fast, slow, i):
            if rsi_values[i] < self.rsi_overbought:
                return Action.BUY, (
                    f"EMA{self.fast} croise au-dessus de EMA{self.slow} "
                    f"et RSI {rsi_values[i]:.1f} < {self.rsi_overbought:g}"
                )
            return Action.HOLD, (
                f"croisement haussier ignoré : RSI {rsi_values[i]:.1f} >= {self.rsi_overbought:g} (suracheté)"
            )
        if crossed_below(fast, slow, i):
            return Action.SELL, f"EMA{self.fast} croise en dessous de EMA{self.slow}"
        return Action.HOLD, "pas de croisement"


def _round(value):
    return None if value is None else round(value, 6)
