import json
import logging

import pytest

from tradebot.alerts import AlertDispatcher, AlertType, Notifier
from tradebot.data import Candle
from tradebot.execution import LiveTradingDisabledError
from tradebot.journal import DecisionJournal
from tradebot.monitoring import format_status, read_status
from tradebot.paper_trading import KillSwitchEngagedError, PaperTrader, StateError, StateStore
from tradebot.risk import KillSwitch
from tradebot.signals import Action

from .helpers import HOUR, FakeClock, FakeProvider, ScriptedStrategy, close_time, make_candles, make_settings


class Collector(Notifier):
    name = "collect"

    def __init__(self):
        self.events = []

    def send(self, event):
        self.events.append(event)

    def types(self):
        return [e.type for e in self.events]


class Harness:
    def __init__(self, tmp_path, *, script=None, candles=None, now=None, **overrides):
        self.candles = candles or make_candles([100.0] * 60)
        self.settings = make_settings(tmp_path, **overrides)
        self.provider = FakeProvider(self.candles)
        self.clock = FakeClock(now if now is not None else close_time(self.candles[-1]) + 30_000)
        self.alerts = Collector()
        self.strategy = ScriptedStrategy(by_timestamp=script or {})
        self.sleeps = []
        self.trader = self.make_trader()

    def make_trader(self, settings=None):
        s = settings or self.settings
        return PaperTrader(
            s, self.provider, self.strategy,
            journal=DecisionJournal(s.log_dir / "decisions.jsonl", logging.getLogger("test.paper")),
            alerts=AlertDispatcher([self.alerts]),
            kill_switch=KillSwitch(s.kill_switch_file),
            store=StateStore(s.state_file),
            clock_ms=self.clock,
            sleep=self.sleeps.append,
        )

    def last_ts(self):
        return self.candles[-1].timestamp

    def add_candle(self, close):
        last = self.candles[-1]
        self.candles.append(Candle(last.timestamp + HOUR, last.close, max(last.close, close) * 1.001,
                                   min(last.close, close) * 0.999, close, 100.0))
        self.provider.price = close
        self.clock.now += HOUR

    def decisions(self):
        path = self.settings.log_dir / "decisions.jsonl"
        return [r for r in map(json.loads, path.read_text().splitlines()) if r["kind"] == "decision"]


def buy_now(tmp_path, **overrides):
    h = Harness(tmp_path, **overrides)
    h.strategy.by_timestamp[h.last_ts()] = Action.BUY
    return h


def test_trading_disabled_by_default_sends_no_order(tmp_path):
    h = buy_now(tmp_path, enable_trading=False)
    report = h.trader.step()
    assert report.action == "TRADING_DISABLED"
    assert h.trader.portfolio.positions == {}
    assert h.trader.broker.recent_orders() == []
    [decision] = h.decisions()
    assert decision["risk"]["verdict"] == "PASS" and decision["action"] == "TRADING_DISABLED"


def test_paper_order_is_executed_journaled_and_persisted(tmp_path):
    h = buy_now(tmp_path)
    report = h.trader.step()
    assert report.action == "PAPER_ORDER"
    position = h.trader.portfolio.positions["BTC/USDT"]
    assert position.stop_loss < position.entry_price < position.take_profit
    assert AlertType.POSITION_OPENED in h.alerts.types()
    [decision] = h.decisions()
    assert decision["signal"] == "BUY" and decision["risk"]["verdict"] == "PASS"
    assert decision["execution_ms"] is not None

    status = read_status(h.settings.status_file)
    assert status["positions"][0]["symbol"] == "BTC/USDT"
    assert status["account"]["cash"] < 10_000

    # Redémarrage : la position et la dernière bougie traitée sont restaurées.
    restarted = h.make_trader()
    assert restarted.portfolio.positions["BTC/USDT"] == position
    assert restarted.step().new_candle is False
    assert len(restarted.portfolio.positions) == 1


def test_same_candle_is_processed_only_once(tmp_path):
    h = buy_now(tmp_path)
    assert h.trader.step().new_candle
    second = h.trader.step()
    assert not second.new_candle and second.action is None
    assert len(h.trader.broker.recent_orders()) == 1


def test_stop_loss_is_monitored_between_candles(tmp_path):
    h = buy_now(tmp_path, large_loss_alert_pct=0.01)
    h.trader.step()
    h.provider.price = 90.0  # sous le stop (2 %)
    h.trader.step()
    assert h.trader.portfolio.positions == {}
    trade = h.trader.portfolio.closed_trades[-1]
    assert trade.exit_reason == "stop-loss" and trade.net_pnl < 0
    assert AlertType.POSITION_CLOSED in h.alerts.types()
    assert AlertType.LARGE_LOSS in h.alerts.types()


def test_sell_signal_closes_position(tmp_path):
    h = buy_now(tmp_path)
    h.trader.step()
    h.add_candle(101.0)
    h.strategy.by_timestamp[h.last_ts()] = Action.SELL
    report = h.trader.step()
    assert report.action == "PAPER_ORDER"
    assert h.trader.portfolio.closed_trades[-1].exit_reason == "script SELL"


def test_in_progress_candle_is_ignored(tmp_path):
    h = buy_now(tmp_path)
    last = h.candles[-1]
    h.provider.in_progress = Candle(last.timestamp + HOUR, 100, 1e6, 99, 1e6, 1)
    report = h.trader.step()
    assert report.signal.candle_timestamp == last.timestamp
    assert report.signal.price == last.close


def test_stale_data_blocks_entries(tmp_path):
    h = buy_now(tmp_path)
    h.clock.now += 5 * HOUR
    report = h.trader.step()
    assert report.action == "NO_TRADE"
    reasons = " ".join(h.decisions()[0]["risk"]["reasons"])
    assert "trop ancienne" in reasons and "signal trop ancien" in reasons


@pytest.mark.parametrize("price,reason", [(110.0, "écart"), (0.0, "incohérent"), (float("nan"), "incohérent")])
def test_inconsistent_prices_block_entries(tmp_path, price, reason):
    h = buy_now(tmp_path)
    h.provider.price = price
    assert h.trader.step().action == "NO_TRADE"
    assert reason in " ".join(h.decisions()[0]["risk"]["reasons"])


def test_risk_halt_blocks_strategy_buy(tmp_path):
    h = buy_now(tmp_path)
    h.trader.risk.halt("drawdown max")
    assert h.trader.step().action == "NO_TRADE"
    assert h.trader.portfolio.positions == {}


def test_kill_switch_prevents_start(tmp_path):
    h = Harness(tmp_path)
    KillSwitch(h.settings.kill_switch_file).engage("test")
    with pytest.raises(KillSwitchEngagedError):
        h.trader.run()


def test_kill_switch_stops_running_bot(tmp_path):
    h = Harness(tmp_path)
    kill = KillSwitch(h.settings.kill_switch_file)
    h.trader.sleep = lambda _s: kill.engage("urgence")
    reason = h.trader.run()
    assert "kill switch" in reason and "urgence" in reason
    status = read_status(h.settings.status_file)
    assert status["bot"]["state"] == "stopped" and status["bot"]["kill_switch"] is True
    assert AlertType.BOT_STOPPED in h.alerts.types()
    assert "STOPPED" in format_status(status, h.clock.now)


def test_api_reconnection_after_transient_failures(tmp_path):
    h = Harness(tmp_path)
    h.provider.failures_left = 2
    reason = h.trader.run(max_iterations=3)
    assert "3 cycle" in reason
    assert h.trader.consecutive_errors == 0
    assert h.alerts.types().count(AlertType.API_PROBLEM) == 1
    assert AlertType.API_RECOVERED in h.alerts.types()
    assert read_status(h.settings.status_file)["api"]["status"] == "ok"


def test_automatic_stop_after_consecutive_errors(tmp_path):
    h = Harness(tmp_path)
    h.provider.always_fail = True
    reason = h.trader.run()
    assert "3 erreurs consécutives" in reason
    assert h.provider.calls == 3
    assert AlertType.BOT_STOPPED in h.alerts.types()
    status = read_status(h.settings.status_file)
    assert status["api"]["status"] == "down" and len(status["last_errors"]) == 3


def test_interruptible_sleep_uses_one_second_slices(tmp_path):
    h = Harness(tmp_path, poll_seconds=5)
    h.trader.run(max_iterations=2)
    assert h.sleeps == [1.0] * 5  # une attente entre les 2 cycles


def test_state_of_another_configuration_is_refused(tmp_path):
    h = buy_now(tmp_path)
    h.trader.step()
    from dataclasses import replace
    with pytest.raises(StateError, match="position inconnue"):
        h.make_trader(replace(h.settings, timeframe="4h"))


def test_corrupted_state_is_refused(tmp_path):
    h = Harness(tmp_path)
    h.settings.state_file.parent.mkdir(parents=True, exist_ok=True)
    h.settings.state_file.write_text("{ pas du json")
    with pytest.raises(StateError, match="illisible"):
        h.make_trader()


def test_live_mode_cannot_be_started(tmp_path):
    from dataclasses import replace
    h = Harness(tmp_path)
    with pytest.raises(LiveTradingDisabledError):
        h.make_trader(replace(h.settings, mode="live", enable_trading=True))
