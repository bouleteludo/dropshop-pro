from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SizingResult:
    quantity: float
    notional: float
    risk_amount: float  # perte si le stop est touché (hors frais et slippage de sortie)
    limited_by: str


def position_size(
    *,
    equity: float,
    cash: float,
    entry_price: float,
    stop_price: float,
    risk_per_trade_pct: float,
    max_position_pct: float,
    fee_rate: float,
) -> SizingResult:
    """Taille de position à risque fixe.

    On risque au maximum `risk_per_trade_pct` % du capital entre l'entrée et
    le stop : quantité = risque / (entrée - stop). Le résultat est ensuite
    plafonné par la taille maximale de position et par les liquidités.
    """
    if entry_price <= 0:
        raise ValueError("entry_price doit être > 0")
    if stop_price >= entry_price:
        raise ValueError("le stop doit être sous le prix d'entrée pour une position longue")

    per_unit_risk = entry_price - stop_price
    candidates = [
        (equity * risk_per_trade_pct / 100 / per_unit_risk * entry_price, "risque par trade"),
        (equity * max_position_pct / 100, "taille max de position"),
        # Marge de 1e-9 : l'arrondi flottant ne doit pas faire refuser l'ordre.
        (max(cash, 0.0) / (1 + fee_rate) * (1 - 1e-9), "liquidités disponibles"),
    ]
    notional, limited_by = min(candidates, key=lambda c: c[0])
    notional = max(notional, 0.0)
    quantity = notional / entry_price
    return SizingResult(quantity, notional, quantity * per_unit_risk, limited_by)
