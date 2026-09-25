import random

import pytest

from tradebot.indicators import crossed_above, crossed_below, ema, rsi, sma


def test_sma_known_values():
    assert sma([1, 2, 3, 4, 5], 3) == [None, None, 2, 3, 4]


def test_ema_is_seeded_with_sma_then_smoothed():
    # période 3 : alpha = 0.5, graine = SMA(1,2,3) = 2
    assert ema([1, 2, 3, 4, 5, 6], 3) == [None, None, 2, 3, 4, 5]


def test_ema_not_enough_data():
    assert ema([1, 2], 3) == [None, None]


def test_rsi_hand_computed():
    # variations : +1, -0.5, +1, -0.5 ; Wilder, période 2
    values = rsi([10, 11, 10.5, 11.5, 11], 2)
    assert values[:2] == [None, None]
    assert values[2] == pytest.approx(100 - 100 / (1 + 2))      # RS = 0.5 / 0.25
    assert values[3] == pytest.approx(100 - 100 / (1 + 6))      # RS = 0.75 / 0.125
    assert values[4] == pytest.approx(100 - 100 / (1 + 1.2))   # RS = 0.375 / 0.3125


def test_rsi_extremes():
    assert rsi(list(range(1, 20)), 14)[-1] == 100.0
    assert rsi(list(range(20, 1, -1)), 14)[-1] == 0.0
    assert rsi([5.0] * 20, 14)[-1] == 50.0


@pytest.mark.parametrize("bad", [0, -1])
def test_invalid_periods(bad):
    with pytest.raises(ValueError):
        sma([1, 2, 3], bad)
    with pytest.raises(ValueError):
        ema([1, 2, 3], bad)
    with pytest.raises(ValueError):
        rsi([1, 2, 3], 1)


@pytest.mark.parametrize("fn,period", [(sma, 10), (ema, 10), (rsi, 14)])
def test_indicators_are_causal(fn, period):
    """Anti look-ahead : la valeur à l'index i est identique qu'on connaisse
    ou non la suite de la série."""
    rng = random.Random(1)
    values = [100 + rng.gauss(0, 1) for _ in range(200)]
    full = fn(values, period)
    for i in range(0, 200, 7):
        assert fn(values[: i + 1], period)[-1] == full[i]


def test_crossovers():
    a = [1, 2, 3, 2, 1]
    b = [2, 2, 2, 2, 2]
    assert [crossed_above(a, b, i) for i in range(5)] == [False, False, True, False, False]
    assert [crossed_below(a, b, i) for i in range(5)] == [False, False, False, False, True]


def test_crossover_needs_both_values():
    assert not crossed_above([None, 3], [2, 2], 1)
    assert not crossed_above([1, 3], [2, 2], 0)
