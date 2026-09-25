import math

import pytest

from tradebot.data import Candle
from tradebot.execution import CostModel, Order, OrderSide, OrderStatus, OrderType
from tradebot.portfolio import Position
from tradebot.risk import KillSwitch, RiskLimits, RiskManager, RiskState, position_size
from tradebot.risk.exits import exit_on_candle, exit_on_price

from .helpers import T0

DAY = 86_400_000
NO_COSTS = CostModel(0, 0, 0)


def manager(limits=None, equity=10_000.0, costs=NO_COSTS):
    return RiskManager(limits or RiskLimits(), costs, equity, RiskState.initial(equity, T0))


def entry(rm, **overrides):
    params = dict(symbol="BTC/USDT", price=100.0, reference_price=100.0, equity=10_000.0, cash=10_000.0, positions={})
    params.update(overrides)
    return rm.evaluate_entry(**params)


# --- Position sizing ---------------------------------------------------------
def test_sizing_risks_fixed_fraction_of_equity():
    s = position_size(equity=10_000, cash=10_000, entry_price=100, stop_price=98,
                      risk_per_trade_pct=1, max_position_pct=100, fee_rate=0)
    assert s.limited_by == "risque par trade"
    assert s.quantity == pytest.approx(50)          # 100 de risque / 2 par unité
    assert s.risk_amount == pytest.approx(100)      # 1 % de 10 000


def test_sizing_capped_by_max_position():
    s = position_size(equity=10_000, cash=10_000, entry_price=100, stop_price=98,
                      risk_per_trade_pct=1, max_position_pct=25, fee_rate=0)
    assert s.limited_by == "taille max de position"
    assert s.notional == pytest.approx(2_500)
    assert s.risk_amount == pytest.approx(50)


def test_sizing_capped_by_cash_including_fees():
    s = position_size(equity=10_000, cash=1_000, entry_price=100, stop_price=98,
                      risk_per_trade_pct=1, max_position_pct=100, fee_rate=0.001)
    assert s.limited_by == "liquidités disponibles"
    assert s.notional * 1.001 <= 1_000


def test_sizing_rejects_stop_above_entry():
    with pytest.raises(ValueError):
        position_size(equity=1, cash=1, entry_price=100, stop_price=100,
                      risk_per_trade_pct=1, max_position_pct=10, fee_rate=0)


# --- Entrées -----------------------------------------------------------------
def test_entry_approved_with_stop_and_target():
    d = entry(manager(RiskLimits(max_position_pct=100)))
    assert d.approved and d.verdict == "PASS"
    assert d.stop_loss == pytest.approx(98)
    assert d.take_profit == pytest.approx(104)
    assert d.quantity * (d.entry_price - d.stop_loss) == pytest.approx(100)  # 1 % du capital


def test_stop_and_target_are_relative_to_expected_fill():
    costs = CostModel(0.001, 0.0005, 0.0002)
    d = entry(manager(costs=costs))
    fill = costs.execution_price(OrderSide.BUY, 100)
    assert d.entry_price == pytest.approx(fill)
    assert d.stop_loss == pytest.approx(fill * 0.98)


@pytest.mark.parametrize(
    "setup,overrides,reason",
    [
        (lambda rm: rm.halt("test"), {}, "arrêté"),
        (lambda rm: setattr(rm.state, "day_blocked", True), {}, "perte journalière"),
        (None, {"price": math.nan}, "prix incohérent"),
        (None, {"price": 0.0}, "prix incohérent"),
        (None, {"price": 110.0}, "écart"),
        (None, {"positions": {"BTC/USDT": Position("BTC/USDT", 1, 100, 0, T0)}}, "déjà ouverte"),
        (None, {"positions": {"ETH/USDT": Position("ETH/USDT", 1, 100, 0, T0)}}, "nombre max de positions"),
        (None, {"open_orders": [Order("1", "BTC/USDT", OrderSide.BUY, OrderType.MARKET, 1, OrderStatus.NEW, T0)]}, "en attente"),
        (lambda rm: setattr(rm.state, "trades_today", 5), {}, "trades par jour"),
        (None, {"cash": 5.0}, "minimum"),
        (None, {"data_problems": ["flux interrompu"]}, "données : flux interrompu"),
        (None, {"equity": -1.0}, "capital incohérent"),
    ],
)
def test_entry_rejections(setup, overrides, reason):
    """STRATEGY = BUY → RISK MANAGER = REJECT → FINAL ACTION = NO TRADE"""
    rm = manager()
    if setup:
        setup(rm)
    d = entry(rm, **overrides)
    assert not d.approved and d.verdict == "REJECT"
    assert any(reason in r for r in d.reasons), d.reasons


# --- Sorties -----------------------------------------------------------------
def test_exit_allowed_even_when_halted():
    rm = manager()
    rm.halt("drawdown")
    pos = {"BTC/USDT": Position("BTC/USDT", 2, 100, 0, T0)}
    d = rm.evaluate_exit(symbol="BTC/USDT", price=90, positions=pos)
    assert d.approved and d.quantity == 2


def test_exit_rejects_unknown_position_or_bad_price():
    rm = manager()
    assert "aucune position" in rm.evaluate_exit(symbol="BTC/USDT", price=90, positions={}).reasons[0]
    pos = {"BTC/USDT": Position("BTC/USDT", 2, 100, 0, T0)}
    assert not rm.evaluate_exit(symbol="BTC/USDT", price=-1, positions=pos).approved


# --- Limites de capital -------------------------------------------------------
def test_drawdown_halt_is_latched():
    rm = manager(RiskLimits(max_drawdown_pct=10, max_daily_loss_pct=50))
    rm.update(12_000, T0)
    events = rm.update(10_700, T0 + 1)  # -10.8 % depuis le pic
    assert rm.state.halted and "drawdown" in rm.state.halt_reason and events
    rm.update(13_000, T0 + 3 * DAY)  # le capital remonte…
    assert rm.state.halted  # … l'arrêt reste verrouillé
    rm.reset_halt()
    assert not rm.state.halted


def test_total_loss_halt():
    rm = manager(RiskLimits(max_drawdown_pct=90, max_total_loss_pct=20, max_daily_loss_pct=90))
    rm.update(7_900, T0)
    assert rm.state.halted and "perte globale" in rm.state.halt_reason


def test_daily_loss_blocks_until_next_utc_day():
    rm = manager(RiskLimits(max_daily_loss_pct=3))
    rm.record_entry()
    rm.update(9_650, T0 + 1_000)
    assert rm.state.day_blocked
    assert not entry(rm).approved
    rm.update(9_650, T0 + DAY)  # nouvelle journée UTC
    assert not rm.state.day_blocked
    assert rm.state.trades_today == 0
    assert rm.state.day_start_equity == 9_650


def test_state_roundtrip():
    rm = manager()
    rm.halt("x")
    assert RiskState.from_dict(rm.state.to_dict()) == rm.state


# --- Stop-loss / take-profit ----------------------------------------------------
POS = Position("X", 1, 100, 0, T0, stop_loss=95, take_profit=110)


def candle(o, h, l, c):
    return Candle(T0, o, h, l, c, 1)


def test_exit_on_price():
    assert exit_on_price(POS, 94) == "stop-loss"
    assert exit_on_price(POS, 111) == "take-profit"
    assert exit_on_price(POS, 100) is None


def test_exit_on_candle_levels():
    assert exit_on_candle(POS, candle(100, 101, 94, 99)) == (95, "stop-loss")
    assert exit_on_candle(POS, candle(100, 112, 99, 105)) == (110, "take-profit")
    assert exit_on_candle(POS, candle(100, 105, 96, 101)) is None


def test_exit_on_candle_gap_fills_at_open_not_at_level():
    assert exit_on_candle(POS, candle(90, 92, 88, 91)) == (90, "stop-loss (gap à l'ouverture)")
    assert exit_on_candle(POS, candle(115, 118, 114, 116)) == (115, "take-profit (gap à l'ouverture)")


def test_exit_on_candle_pessimistic_when_both_levels_hit():
    assert exit_on_candle(POS, candle(100, 112, 94, 100)) == (95, "stop-loss")


# --- Kill switch --------------------------------------------------------------
def test_kill_switch(tmp_path):
    ks = KillSwitch(tmp_path / "state" / "KILL_SWITCH")
    assert not ks.engaged()
    ks.engage("marché anormal")
    assert ks.engaged() and "marché anormal" in ks.reason()
    assert ks.release() is True
    assert not ks.engaged()
    assert ks.release() is False
