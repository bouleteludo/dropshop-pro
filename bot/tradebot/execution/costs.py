from __future__ import annotations

from dataclasses import dataclass

from .models import OrderSide


@dataclass(frozen=True)
class CostModel:
    """Coûts de transaction appliqués à chaque exécution simulée.

    - spread   : écart achat/vente ; on paie la moitié à chaque passage d'ordre.
    - slippage : glissement défavorable entre le prix vu et le prix obtenu.
    - frais    : commission de la plateforme, en % du montant échangé.
    """

    fee_rate: float = 0.001
    slippage_rate: float = 0.0005
    spread_rate: float = 0.0002

    @classmethod
    def from_pct(cls, fee_pct: float, slippage_pct: float, spread_pct: float) -> "CostModel":
        return cls(fee_pct / 100, slippage_pct / 100, spread_pct / 100)

    def execution_price(self, side: OrderSide, reference_price: float) -> float:
        impact = self.spread_rate / 2 + self.slippage_rate
        return reference_price * (1 + impact) if side is OrderSide.BUY else reference_price * (1 - impact)

    def fee(self, notional: float) -> float:
        return abs(notional) * self.fee_rate
