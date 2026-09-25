import json
import logging

from tradebot.alerts import AlertDispatcher, AlertLevel, AlertType, Notifier
from tradebot.execution import OrderSide
from tradebot.journal import DecisionJournal, RedactingFilter, collect_secrets, setup_logging
from tradebot.risk import RiskDecision

SECRET = "sk_live_ABCDEF123456"


def test_collect_secrets_only_picks_sensitive_variables():
    env = {"EXCHANGE_API_KEY": SECRET, "TELEGRAM_BOT_TOKEN": "123456:abcdef", "SYMBOL": "BTC/USDT", "API_SECRET": "x"}
    secrets = collect_secrets(env)
    assert SECRET in secrets and "123456:abcdef" in secrets
    assert "BTC/USDT" not in secrets
    assert "x" not in secrets  # trop court pour être masqué sans risque


def test_secrets_are_masked_in_log_files(tmp_path):
    logger = setup_logging(tmp_path, "INFO", [SECRET])
    logger.info("clé utilisée : %s", SECRET)
    try:
        raise RuntimeError(f"requête refusée apikey={SECRET}")
    except RuntimeError:
        logger.exception("erreur")
    for handler in logger.handlers:
        handler.flush()
    content = (tmp_path / "bot.log").read_text()
    assert SECRET not in content
    assert content.count("***") >= 2


def test_redacting_filter_on_message_args():
    f = RedactingFilter([SECRET])
    record = logging.LogRecord("t", logging.INFO, __file__, 1, "token=%s", (SECRET,), None)
    f.filter(record)
    assert record.getMessage() == "token=***"


def test_decision_journal_is_traceable(tmp_path, caplog):
    journal = DecisionJournal(tmp_path / "decisions.jsonl", logging.getLogger("test.journal"))
    risk = RiskDecision(False, OrderSide.BUY, ["perte journalière max (3%) atteinte aujourd'hui"])
    with caplog.at_level(logging.INFO, logger="test.journal"):
        journal.decision(
            mode="paper", symbol="BTC/USDT", timeframe="15m", strategy="ema_cross_rsi", signal="BUY",
            price=65000.0, reason="croisement", indicators={"EMA_FAST(20)": 64900.0, "RSI(14)": 55.0},
            risk=risk, action="NO_TRADE", execution_ms=12.3,
        )
    record = json.loads((tmp_path / "decisions.jsonl").read_text().splitlines()[0])
    assert record["kind"] == "decision" and record["signal"] == "BUY" and record["action"] == "NO_TRADE"
    assert record["risk"]["verdict"] == "REJECT"
    assert record["indicators"]["RSI(14)"] == 55.0
    line = caplog.records[0].getMessage()
    for token in ("ASSET=BTC/USDT", "TIMEFRAME=15m", "SIGNAL=BUY", "RSI(14)=55", "RISK_CHECK=REJECT", "ACTION=NO_TRADE"):
        assert token in line


def test_alert_dispatcher_survives_failing_channel():
    received = []

    class Broken(Notifier):
        name = "broken"

        def send(self, event):
            raise ConnectionError("telegram injoignable")

    class Collect(Notifier):
        name = "collect"

        def send(self, event):
            received.append(event)

    dispatcher = AlertDispatcher([Broken(), Collect()])
    event = dispatcher.send(AlertType.LARGE_LOSS, AlertLevel.WARNING, "perte", pnl=-250)
    assert received == [event]
    assert event.data == {"pnl": -250}
