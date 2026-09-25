#!/usr/bin/env python3
"""Bot de trading — point d'entrée en ligne de commande.

    python main.py check-config
    python main.py download --days 365
    python main.py backtest --days 365
    python main.py optimize --method walk-forward --days 730
    python main.py run
    python main.py status
    python main.py kill --reason "marché anormal"
    python main.py resume
    python main.py reset-halt

Voir README.md pour le détail.
"""

from __future__ import annotations

import argparse
import signal
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from tradebot.alerts import AlertDispatcher, LogNotifier  # noqa: E402
from tradebot.backtesting import (  # noqa: E402
    DEFAULT_GRID, BacktestConfig, run_backtest, train_validation_test, walk_forward,
)
from tradebot.backtesting.report import (  # noqa: E402
    export_backtest, format_backtest_report, format_split, format_walk_forward,
)
from tradebot.config import ConfigError, Settings, load_settings  # noqa: E402
from tradebot.data import (  # noqa: E402
    Candle, DataUnavailableError, generate_candles, load_candles_csv, save_candles_csv, timeframe_to_ms,
    validate_candles,
)
from tradebot.execution import LiveTradingDisabledError, ensure_live_trading_allowed  # noqa: E402
from tradebot.journal import DecisionJournal, collect_secrets, setup_logging  # noqa: E402
from tradebot.monitoring import format_status, read_status  # noqa: E402
from tradebot.paper_trading import KillSwitchEngagedError, PaperTrader, StateError, StateStore  # noqa: E402
from tradebot.risk import KillSwitch  # noqa: E402
from tradebot.strategies import STRATEGIES, create_strategy  # noqa: E402


def now_ms() -> int:
    return int(time.time() * 1000)


def build_strategy(settings: Settings):
    return create_strategy(settings.strategy, **settings.strategy_params())


def strategy_factory(settings: Settings):
    return STRATEGIES[settings.strategy]


# --- Données -----------------------------------------------------------------
def add_data_args(p: argparse.ArgumentParser) -> None:
    src = p.add_mutually_exclusive_group()
    src.add_argument("--csv", type=Path, help="historique enregistré (voir la commande download)")
    src.add_argument("--synthetic", type=int, metavar="N",
                     help="N bougies SYNTHÉTIQUES (test du code hors-ligne, aucune valeur prédictive)")
    p.add_argument("--days", type=int, default=365, help="profondeur d'historique à télécharger (défaut 365)")
    p.add_argument("--seed", type=int, default=42, help="graine des données synthétiques")


def load_candles(args, settings: Settings) -> tuple[list[Candle], str]:
    if args.csv:
        candles, label = load_candles_csv(args.csv), f"CSV {args.csv}"
    elif args.synthetic:
        candles = generate_candles(args.synthetic, timeframe=settings.timeframe, seed=args.seed)
        label = "DONNÉES SYNTHÉTIQUES (aucune valeur prédictive)"
    else:
        from tradebot.data.ccxt_provider import CcxtProvider

        tf_ms = timeframe_to_ms(settings.timeframe)
        end = now_ms() // tf_ms * tf_ms  # exclut la bougie en cours
        start = end - args.days * 86_400_000
        print(f"Téléchargement {settings.exchange} {settings.symbol} {settings.timeframe} sur {args.days} jours…")
        candles = CcxtProvider(settings.exchange).fetch_history(settings.symbol, settings.timeframe, start, end)
        label = f"{settings.exchange} (API publique)"
    report = validate_candles(candles, settings.timeframe)
    for warning in report.warnings:
        print(f"⚠ données : {warning}")
    if not report.ok:
        raise SystemExit("Données inexploitables :\n  - " + "\n  - ".join(report.errors[:10]))
    return candles, label


# --- Commandes ---------------------------------------------------------------
def cmd_check_config(args, settings: Settings) -> int:
    for key, value in settings.public_view().items():
        print(f"{key:<28} {value}")
    try:
        ensure_live_trading_allowed(settings)
    except LiveTradingDisabledError as exc:
        print(f"\nTrading réel : DÉSACTIVÉ\n{exc}")
    print("\nConfiguration valide.")
    return 0


def cmd_download(args, settings: Settings) -> int:
    candles, label = load_candles(args, settings)
    out = args.out or BASE_DIR / "data_cache" / f"{settings.exchange}_{settings.symbol.replace('/', '-')}_{settings.timeframe}.csv"
    save_candles_csv(out, candles)
    print(f"{len(candles)} bougies ({label}) enregistrées dans {out}")
    return 0


def cmd_backtest(args, settings: Settings) -> int:
    candles, label = load_candles(args, settings)
    strategy = build_strategy(settings)
    if len(candles) <= strategy.warmup:
        raise SystemExit(f"Historique trop court : {len(candles)} bougies pour un warm-up de {strategy.warmup}.")
    config = BacktestConfig.from_settings(settings, close_at_end=not args.keep_open)
    result = run_backtest(candles, strategy, config)
    print(format_backtest_report(result, label))
    trades_path, equity_path = export_backtest(result, args.export)
    print(f"\nDétail : {trades_path} et {equity_path}")
    return 0


def cmd_optimize(args, settings: Settings) -> int:
    candles, label = load_candles(args, settings)
    print(f"Données : {label}, {len(candles)} bougies")
    config = BacktestConfig.from_settings(settings)
    factory = strategy_factory(settings)
    if args.method == "split":
        print(format_split(train_validation_test(candles, factory, DEFAULT_GRID, config, min_trades=args.min_trades)))
    else:
        result = walk_forward(
            candles, factory, DEFAULT_GRID, config,
            train_bars=args.train_bars, test_bars=args.test_bars, min_trades=args.min_trades,
        )
        print(format_walk_forward(result))
    return 0


def cmd_run(args, settings: Settings) -> int:
    logger = setup_logging(settings.log_dir, settings.log_level, collect_secrets())
    if settings.mode != "paper":
        try:
            ensure_live_trading_allowed(settings)
        except LiveTradingDisabledError as exc:
            logger.error("%s", exc)
            return 2

    from tradebot.data.ccxt_provider import CcxtProvider

    kill_switch = KillSwitch(settings.kill_switch_file)
    stop_requested = []

    def guarded_sleep(seconds: float) -> None:
        # Attentes entre deux tentatives de reconnexion : interrompues dès que
        # le kill switch est engagé ou qu'un arrêt est demandé (SIGTERM).
        end = time.monotonic() + seconds
        while (remaining := end - time.monotonic()) > 0:
            if stop_requested or kill_switch.engaged():
                raise DataUnavailableError("arrêt demandé pendant une tentative de reconnexion")
            time.sleep(min(1.0, remaining))

    try:
        trader = PaperTrader(
            settings,
            CcxtProvider(settings.exchange, sleep=guarded_sleep),
            build_strategy(settings),
            journal=DecisionJournal(settings.log_dir / "decisions.jsonl", logger.getChild("journal")),
            alerts=AlertDispatcher([LogNotifier(logger.getChild("alerts"))]),
            kill_switch=kill_switch,
            store=StateStore(settings.state_file),
            logger=logger.getChild("paper"),
        )
    except StateError as exc:
        logger.error("%s", exc)
        return 2

    def on_signal(signum, _frame):
        stop_requested.append(signum)
        trader.request_stop(f"signal {signal.Signals(signum).name} reçu")

    signal.signal(signal.SIGTERM, on_signal)
    try:
        reason = trader.run(max_iterations=args.max_iterations)
    except KillSwitchEngagedError as exc:
        logger.error("%s", exc)
        return 3
    return 1 if "erreurs consécutives" in reason else 0


def cmd_status(args, settings: Settings) -> int:
    print(format_status(read_status(settings.status_file), now_ms()))
    return 0


def cmd_kill(args, settings: Settings) -> int:
    KillSwitch(settings.kill_switch_file).engage(args.reason)
    print(f"Kill switch ENGAGÉ ({settings.kill_switch_file}). Le bot s'arrête dans la seconde et")
    print("refusera de redémarrer tant que tu n'auras pas lancé : python main.py resume")
    return 0


def cmd_resume(args, settings: Settings) -> int:
    if KillSwitch(settings.kill_switch_file).release():
        print("Kill switch levé. Le bot peut être relancé : python main.py run")
    else:
        print("Le kill switch n'était pas engagé.")
    return 0


def cmd_reset_halt(args, settings: Settings) -> int:
    status = read_status(settings.status_file)
    if status and status["bot"]["state"] == "running" and now_ms() - status["bot"]["heartbeat_ms"] < 120_000 + 3000 * settings.poll_seconds:
        raise SystemExit("Le bot semble tourner : arrête-le d'abord (python main.py kill), sinon il écraserait la modification.")
    store = StateStore(settings.state_file)
    data = store.load()
    if data is None:
        print(f"Aucun état trouvé ({settings.state_file}).")
        return 0
    risk = data["risk"]
    if not risk.get("halted"):
        print("Le risk manager n'est pas en arrêt.")
        return 0
    print(f"Arrêt levé (motif précédent : {risk['halt_reason']}).")
    risk["halted"], risk["halt_reason"] = False, ""
    store.save({k: v for k, v in data.items() if k != "version"})
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bot de trading : backtest, paper trading, gestion du risque.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check-config", help="affiche et valide la configuration (secrets masqués)")

    p = sub.add_parser("download", help="télécharge l'historique dans un CSV (backtests reproductibles)")
    add_data_args(p)
    p.add_argument("--out", type=Path)

    p = sub.add_parser("backtest", help="backtest de la stratégie configurée")
    add_data_args(p)
    p.add_argument("--keep-open", action="store_true", help="ne pas clôturer la position ouverte en fin de période")
    p.add_argument("--export", type=Path, default=BASE_DIR / "reports", help="dossier des CSV de résultats")

    p = sub.add_parser("optimize", help="validation hors échantillon (walk-forward ou train/validation/test)")
    add_data_args(p)
    p.add_argument("--method", choices=("walk-forward", "split"), default="walk-forward")
    p.add_argument("--train-bars", type=int, default=2000)
    p.add_argument("--test-bars", type=int, default=500)
    p.add_argument("--min-trades", type=int, default=5)

    p = sub.add_parser("run", help="lance le paper trading (vrais prix, ordres simulés)")
    p.add_argument("--max-iterations", type=int, help="s'arrêter après N cycles (tests)")

    sub.add_parser("status", help="état du bot (monitoring)")
    p = sub.add_parser("kill", help="ARRÊT D'URGENCE : stoppe le bot et bloque son redémarrage")
    p.add_argument("--reason", default="arrêt d'urgence manuel")
    sub.add_parser("resume", help="lève le kill switch")
    sub.add_parser("reset-halt", help="lève un arrêt du risk manager (drawdown, perte globale) après analyse")
    return parser


COMMANDS = {
    "check-config": cmd_check_config,
    "download": cmd_download,
    "backtest": cmd_backtest,
    "optimize": cmd_optimize,
    "run": cmd_run,
    "status": cmd_status,
    "kill": cmd_kill,
    "resume": cmd_resume,
    "reset-halt": cmd_reset_halt,
}


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    load_dotenv(BASE_DIR / ".env")
    try:
        settings = load_settings(base_dir=BASE_DIR)
    except ConfigError as exc:
        print(exc, file=sys.stderr)
        return 2
    return COMMANDS[args.command](args, settings)


if __name__ == "__main__":
    sys.exit(main())
