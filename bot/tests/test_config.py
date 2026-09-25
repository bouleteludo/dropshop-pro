from pathlib import Path

import pytest

from tradebot.config import ConfigError, Settings, load_settings
from tradebot.execution import LiveTradingDisabledError, ensure_live_trading_allowed
from tradebot.execution.live_guard import LIVE_CONFIRMATION_PHRASE


def test_defaults_are_safe():
    s = load_settings({})
    assert s.mode == "paper"
    assert s.enable_trading is False
    assert s.api_key == "" and s.api_secret == ""


def test_env_values_are_parsed():
    s = load_settings({
        "SYMBOL": "eth/usdt", "TIMEFRAME": "15m", "ENABLE_TRADING": "true", "RISK_PER_TRADE_PCT": "0.5",
        "MAX_OPEN_POSITIONS": "2", "STATE_DIR": "custom",
    }, base_dir=Path("/srv/bot"))
    assert s.symbol == "ETH/USDT" and s.timeframe == "15m" and s.enable_trading
    assert s.risk_per_trade_pct == 0.5 and s.max_open_positions == 2
    assert s.state_dir == Path("/srv/bot/custom")
    assert s.state_file == Path("/srv/bot/custom/paper_binance_ETH-USDT.json")


@pytest.mark.parametrize(
    "env,message",
    [
        ({"ENABLE_TRADING": "peut-être"}, "ENABLE_TRADING"),
        ({"STOP_LOSS_PCT": "abc"}, "STOP_LOSS_PCT"),
        ({"MODE": "turbo"}, "MODE"),
        ({"EMA_FAST": "60", "EMA_SLOW": "50"}, "EMA_FAST"),
        ({"RISK_PER_TRADE_PCT": "0"}, "RISK_PER_TRADE_PCT"),
        ({"MAX_DRAWDOWN_PCT": "150"}, "MAX_DRAWDOWN_PCT"),
        ({"SYMBOL": "BTCUSDT"}, "SYMBOL"),
        ({"HISTORY_LIMIT": "100"}, "HISTORY_LIMIT"),
    ],
)
def test_invalid_values_are_rejected(env, message):
    with pytest.raises(ConfigError, match=message):
        load_settings(env)


def test_secrets_never_appear_in_repr_or_public_view():
    s = load_settings({"EXCHANGE_API_KEY": "cle-tres-secrete", "EXCHANGE_API_SECRET": "secret-tres-secret"})
    assert "cle-tres-secrete" not in repr(s)
    assert "secret-tres-secret" not in repr(s)
    view = s.public_view()
    assert view["api_key"] == "***" and view["api_secret"] == "***"
    assert "secret-tres-secret" not in str(view)


def test_live_trading_refused_by_default():
    with pytest.raises(LiveTradingDisabledError, match="MODE"):
        ensure_live_trading_allowed(Settings())


def test_live_trading_refused_even_with_every_flag_in_v1():
    s = Settings(mode="live", enable_trading=True, live_trading_confirmation=LIVE_CONFIRMATION_PHRASE,
                 api_key="k" * 10, api_secret="s" * 10)
    with pytest.raises(LiveTradingDisabledError, match="aucun broker réel") as exc:
        ensure_live_trading_allowed(s)
    assert "MODE" not in str(exc.value)  # seul le verrou V1 reste


def test_live_confirmation_must_be_exact():
    s = Settings(mode="live", enable_trading=True, live_trading_confirmation="oui", api_key="k" * 10, api_secret="s" * 10)
    with pytest.raises(LiveTradingDisabledError, match="LIVE_TRADING_CONFIRMATION"):
        ensure_live_trading_allowed(s)
