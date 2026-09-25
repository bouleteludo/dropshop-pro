from __future__ import annotations

from .moving_averages import Series


def crossed_above(a: Series, b: Series, i: int) -> bool:
    """Vrai si `a` passe au-dessus de `b` sur la bougie i (compare i-1 et i)."""
    if i < 1 or None in (a[i - 1], b[i - 1], a[i], b[i]):
        return False
    return a[i - 1] <= b[i - 1] and a[i] > b[i]


def crossed_below(a: Series, b: Series, i: int) -> bool:
    """Vrai si `a` passe en dessous de `b` sur la bougie i."""
    return crossed_above(b, a, i)
