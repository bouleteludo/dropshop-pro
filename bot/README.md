# Bot de trading — V1 (backtest + paper trading)

Bot de trading crypto modulaire, testé et journalisé. Il récupère les données
de marché, génère des signaux, les soumet à un gestionnaire de risque
indépendant et exécute des ordres **simulés**.

> **Aucune promesse de gain.** La stratégie fournie est une *hypothèse à
> tester*, pas une stratégie rentable. Un backtest positif signifie seulement
> que la stratégie *aurait* produit ce résultat sur cet historique, avec ces
> hypothèses de frais, slippage et spread. Liquidité, changement de régime de
> marché et risque d'exécution ne sont que partiellement modélisés.

> **Pas de trading réel en V1.** Aucun broker réel n'existe dans le code. Le
> verrou `execution/live_guard.py` refuse le mode `live` même si toutes les
> variables sont activées.

Parcours imposé : **BACKTEST → PAPER TRADING → VALIDATION → (V3) TRADING RÉEL OPTIONNEL**.

---

## Sommaire

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Lancement rapide](#lancement-rapide)
4. [Backtesting](#backtesting)
5. [Validation hors échantillon (anti-overfitting)](#validation-hors-échantillon-anti-overfitting)
6. [Paper trading](#paper-trading)
7. [Monitoring, journal et alertes](#monitoring-journal-et-alertes)
8. [Arrêt d'urgence (kill switch)](#arrêt-durgence-kill-switch)
9. [Gestion du risque](#gestion-du-risque)
10. [Stratégies](#stratégies)
11. [Structure du projet](#structure-du-projet)
12. [Tests](#tests)
13. [Dépannage](#dépannage)
14. [Passage au mode réel (V3)](#passage-au-mode-réel-v3)
15. [Feuille de route](#feuille-de-route)

---

## Installation

Il faut Python 3.10 ou plus récent. Le bot est indépendant de la boutique
Next.js du dépôt.

```bash
cd bot
python3 -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
python main.py check-config
```

Dépendances :

| Paquet | Rôle |
|---|---|
| `ccxt` | données de marché publiques (Binance, Kraken, Bybit… plus de 100 plateformes) |
| `python-dotenv` | lecture du fichier `.env` |
| `pytest` | tests (développement uniquement) |

Tous les calculs (indicateurs, métriques) sont écrits en Python pur, sans pandas ni numpy, pour rester lisibles et auditables.

## Configuration

Toute la configuration passe par `bot/.env`. Ce fichier n'est **jamais commité**
(il est dans le `.gitignore`). La liste complète et commentée est dans
[`.env.example`](.env.example). Les pourcentages s'écrivent en % : `1.5` = 1,5 %.

| Variable | Défaut | Rôle |
|---|---|---|
| `MODE` | `paper` | `paper` (simulation) ou `live` (refusé en V1) |
| `ENABLE_TRADING` | `false` | interrupteur global : `false` = observation seule, **aucun** ordre, même simulé |
| `EXCHANGE` / `SYMBOL` / `TIMEFRAME` | `binance` / `BTC/USDT` / `1h` | actif et unité de temps |
| `INITIAL_CAPITAL` | `10000` | capital de départ (backtest et paper) |
| `FEE_PCT` / `SLIPPAGE_PCT` / `SPREAD_PCT` | `0.1` / `0.05` / `0.02` | coûts appliqués à chaque exécution |
| `RISK_PER_TRADE_PCT` | `1` | perte maximale si le stop est touché, en % du capital |
| `MAX_POSITION_PCT` | `25` | taille maximale d'une position, en % du capital |
| `STOP_LOSS_PCT` / `TAKE_PROFIT_PCT` | `2` / `4` | stop et objectif, en % du prix d'entrée |
| `MAX_OPEN_POSITIONS` | `1` | nombre maximum de positions simultanées |
| `MAX_DAILY_LOSS_PCT` | `3` | perte journalière qui bloque les entrées jusqu'au lendemain (UTC) |
| `MAX_DRAWDOWN_PCT` | `15` | baisse depuis le plus haut qui **arrête** le trading (verrouillé) |
| `MAX_TOTAL_LOSS_PCT` | `20` | perte depuis le capital initial qui **arrête** le trading (verrouillé) |
| `MAX_TRADES_PER_DAY` | `5` | nombre maximum d'entrées par jour |
| `MIN_ORDER_VALUE` | `10` | taille minimale d'un ordre (en USDT) |
| `MAX_PRICE_DEVIATION_PCT` | `2` | refus si le prix s'écarte trop de la dernière clôture |
| `MAX_DATA_STALENESS_BARS` | `2` | refus si les données ont plus de N bougies de retard |
| `LARGE_LOSS_ALERT_PCT` | `2` | alerte si un trade perd plus de X % du capital |
| `STRATEGY`, `EMA_FAST`, `EMA_SLOW`, `RSI_PERIOD`, `RSI_OVERBOUGHT` | `ema_cross_rsi`, 20, 50, 14, 70 | stratégie et paramètres |
| `POLL_SECONDS` | `60` | fréquence de la boucle de paper trading |
| `HISTORY_LIMIT` | `500` | bougies chargées à chaque cycle (≥ 3 × `EMA_SLOW`) |
| `MAX_CONSECUTIVE_ERRORS` | `5` | arrêt automatique après N erreurs d'affilée |
| `STATE_DIR` / `LOG_DIR` | `state` / `logs` | fichiers d'état et journaux |
| `EXCHANGE_API_KEY` / `EXCHANGE_API_SECRET` | vides | **inutiles en V1**, réservés à la V3 |

Vérifie ta configuration à tout moment. Les secrets sont masqués à l'affichage :

```bash
python main.py check-config
```

## Lancement rapide

```bash
# 1. Tester la mécanique hors-ligne (données synthétiques, aucune valeur prédictive)
python main.py backtest --synthetic 5000

# 2. Backtest sur un an de vraies données Binance
python main.py backtest --days 365

# 3. Vérifier que la stratégie tient hors échantillon
python main.py optimize --days 730

# 4. Observer en temps réel sans passer d'ordre (ENABLE_TRADING=false)
python main.py run

# 5. Paper trading : mettre ENABLE_TRADING=true dans .env, puis
python main.py run

# 6. Dans un autre terminal
python main.py status
python main.py kill        # arrêt d'urgence
```

## Backtesting

```bash
python main.py backtest --days 365                    # télécharge et teste
python main.py download --days 730                    # enregistre l'historique en CSV…
python main.py backtest --csv data_cache/binance_BTC-USDT_1h.csv   # …pour des tests reproductibles
python main.py backtest --synthetic 8000 --seed 3     # données synthétiques (test du code seulement)
```

Le moteur (`tradebot/backtesting/engine.py`) traite les bougies une par une,
dans cet ordre :

1. **Ouverture** : exécution de l'ordre décidé à la clôture précédente, au prix d'ouverture, avec spread, slippage et frais. Le risk manager revalide l'ordre avec les informations disponibles à cet instant.
2. **Pendant la bougie** : stop-loss et take-profit via le plus bas et le plus haut. En cas de gap, la sortie se fait au prix d'ouverture. Si le stop et l'objectif sont touchés dans la même bougie, le moteur retient le stop (hypothèse pessimiste).
3. **Clôture** : valorisation du portefeuille et contrôle des limites de risque.
4. **Décision** : signal calculé uniquement sur les bougies terminées, exécuté à l'étape 1 de la bougie suivante.

La position encore ouverte à la fin est clôturée au dernier prix (`--keep-open` pour l'éviter).

**Métriques affichées** : rendement total et annualisé (sur 90 jours ou plus), buy & hold de référence, nombre de trades, gagnants, perdants, taux de réussite, profit factor, gain moyen, perte moyenne, espérance par trade, drawdown maximal, Sharpe annualisé, exposition et frais totaux. Des avertissements automatiques signalent notamment moins de 30 trades, une période de moins de 6 mois, un profit factor suspect ou un résultat inférieur au buy & hold.

Le détail est exporté dans `reports/trades.csv` et `reports/equity.csv`.

### Protection contre le look-ahead bias

| Risque | Protection | Test |
|---|---|---|
| Indicateur qui utilise le futur | indicateurs causaux | `test_indicators_are_causal` |
| Signal qui dépend des bougies suivantes | contrat vérifié sur **chaque** index, pour chaque stratégie du registre | `test_no_lookahead_every_registered_strategy`, `test_future_candles_cannot_change_past_signals` |
| Bougie en cours utilisée comme terminée | `closed_candles()` la retire | `test_in_progress_candle_is_removed`, `test_in_progress_candle_is_ignored` |
| Exécution au prix qui a servi à décider | exécution à l'ouverture suivante | `test_signal_is_executed_at_next_open_not_at_signal_close` |
| Moteur influencé par les données futures | résultats passés identiques avec ou sans futur | `test_future_data_does_not_change_past_results` |
| Stop et objectif dans la même bougie | hypothèse pessimiste | `test_exit_on_candle_pessimistic_when_both_levels_hit` |

Ces tests ont été validés par **mutation** : on injecte volontairement une
fuite (stratégie qui lit la bougie suivante, bougie en cours conservée,
exécution au prix de clôture du signal, take-profit avant stop), et chaque
mutation fait échouer au moins un test.

## Validation hors échantillon (anti-overfitting)

Optimiser les paramètres sur tout l'historique puis afficher le meilleur
résultat, c'est mesurer la capacité à coller au passé, pas à prévoir. Le bot
propose deux méthodes :

```bash
python main.py optimize --days 730                                  # walk-forward (défaut)
python main.py optimize --days 730 --train-bars 3000 --test-bars 700
python main.py optimize --days 730 --method split                   # train / validation / test
```

- **Walk-forward** : optimisation sur une fenêtre d'entraînement, évaluation sur la fenêtre suivante (jamais vue), puis décalage. Seule la colonne *test* compte.
- **Train / validation / test** (60/20/20) : optimisation sur TRAIN, choix parmi les 5 meilleurs sur VALIDATION, puis une seule évaluation sur TEST. Ne ré-optimise pas en regardant le résultat TEST.

Le rapport signale automatiquement :
- des fenêtres rentables en entraînement mais perdantes hors échantillon ;
- un Sharpe hors échantillon inférieur à la moitié du Sharpe d'entraînement ;
- des paramètres instables d'une fenêtre à l'autre ;
- un optimum au bord de la grille ;
- trop peu de trades pour conclure.

La grille testée est `DEFAULT_GRID` dans `tradebot/backtesting/walk_forward.py`. L'objectif est le Sharpe, avec un nombre minimal de trades (`--min-trades`).

## Paper trading

```bash
python main.py run                     # tourne jusqu'à Ctrl+C, SIGTERM ou kill switch
python main.py run --max-iterations 3  # quelques cycles puis arrêt
```

À chaque cycle (`POLL_SECONDS`), le bot :

1. récupère les bougies et le dernier prix, retire la bougie en cours et valide les données (trous, doublons, OHLC incohérent, données périmées) ;
2. met à jour le capital, le drawdown et les limites journalières ;
3. surveille le stop-loss et le take-profit de la position ouverte, à chaque cycle ;
4. quand une **nouvelle** bougie se termine : calcule le signal, le soumet au risk manager puis, si tout est validé **et** que `ENABLE_TRADING=true`, passe un ordre simulé ;
5. sauvegarde l'état (`state/paper_<exchange>_<paire>.json`, écriture atomique) et le statut.

Le paper trading utilise **les mêmes** stratégie, risk manager, PaperBroker et
modèle de coûts que le backtest. Les résultats sont donc comparables, à deux différences près :
- en paper, l'entrée se fait au prix du ticker quelques secondes après la clôture, contre l'ouverture suivante en backtest ;
- en paper, le stop est vérifié toutes les `POLL_SECONDS`, contre le plus bas et le plus haut de chaque bougie en backtest.

Un signal d'achat reçu plus de `max(3 × POLL_SECONDS, 120 s)` après la clôture est ignoré : ce ne serait plus le même trade que dans le backtest.

**Redémarrage** : le bot reprend exactement son état (position, capital, dernière bougie traitée, compteurs de risque). Il refuse de démarrer si le fichier d'état est illisible ou appartient à une autre configuration, par exemple un autre timeframe. Il ne reprend jamais une position inconnue.

**Remise à zéro** du paper trading : arrête le bot, puis supprime `state/paper_*.json`.

## Monitoring, journal et alertes

```bash
python main.py status
```

Exemple de sortie (valeurs illustratives) :

```text
Bot            : ACTIF
Mode           : PAPER | ENABLE_TRADING=true
Marché         : binance BTC/USDT 1h | ema_cross_rsi {...}
API            : ok (dernier succès 2026-09-25 14:31:02 UTC)
Capital        : 10,041.20 (cash 7,530.10, initial 10,000.00)
P&L            : total +41.20 (+0.41%) | réalisé +12.00 | latent +29.20 | frais 7.50
Drawdown       : 0.30% | perte du jour 0.00% | trades clôturés 3
Risque         : OK | trades aujourd'hui 1
Positions      : BTC/USDT qty=0.0385 entrée=65 210.00 stop=63 905.80 objectif=67 818.40 …
Derniers signaux / Derniers ordres / Dernières erreurs : …
```

`status` affiche **INACTIF** si le bot n'a plus donné signe de vie depuis plus de 3 cycles (processus planté). Le fichier `state/status.json` servira de source à un dashboard web en V2.

**Journal des décisions**, pour comprendre après coup pourquoi le bot a agi ou refusé d'agir :

- `logs/bot.log` (rotation 5 × 5 Mo, heures en UTC), une ligne par décision (exemple illustratif) :
  ```text
  2026-09-25 14:30:04 UTC INFO    DECISION MODE=PAPER ASSET=BTC/USDT TIMEFRAME=1h STRATEGY=ema_cross_rsi SIGNAL=BUY PRICE=65210 EMA_FAST(20)=65102.3 EMA_SLOW(50)=65088.9 RSI(14)=58.2 ENTRY=65249.1 STOP=63944.2 TAKE_PROFIT=67859.1 POSITION_SIZE=0.0383 NOTIONAL=2500 RISK_CHECK=PASS ACTION=PAPER_ORDER REASON="EMA20 croise au-dessus de EMA50 et RSI 58.2 < 70" EXEC_MS=412
  ```
- `logs/decisions.jsonl` : les mêmes informations en JSON, plus les ordres, les erreurs et les événements. On l'analyse avec `jq` ou pandas, par exemple :
  ```bash
  jq -c 'select(.kind=="decision" and .action=="NO_TRADE") | {time, signal, reasons: .risk.reasons}' logs/decisions.jsonl
  ```

Les actions possibles sont :

| Action | Signification |
|---|---|
| `NONE` | signal HOLD |
| `NO_TRADE` | signal refusé (risque, données, déjà en position…), raisons dans `RISK_REASONS` |
| `TRADING_DISABLED` | validé, mais `ENABLE_TRADING=false` |
| `PAPER_ORDER` | ordre simulé exécuté |
| `ORDER_REJECTED` | refusé par le broker |

**Alertes** : ouverture et fermeture de position, perte importante, arrêt par le risk manager, problème et rétablissement de l'API, erreur, démarrage et arrêt du bot. En V1, elles sont écrites dans les logs (`ALERT[...]`). L'interface `Notifier` (`tradebot/alerts/base.py`) permet d'ajouter Telegram, Discord ou l'email en V2. Leurs jetons se liront depuis `.env` et seront automatiquement masqués dans les logs. Une panne d'un canal d'alerte n'arrête jamais le bot.

## Arrêt d'urgence (kill switch)

Trois niveaux d'arrêt existent :

| Niveau | Commande | Effet |
|---|---|---|
| Interrupteur | `ENABLE_TRADING=false` dans `.env`, puis redémarrage | le bot tourne et journalise mais ne passe aucun ordre. **Attention** : une position ouverte n'est alors plus clôturée automatiquement. |
| Arrêt propre | `Ctrl+C` ou `kill -TERM <pid>` | le bot termine le cycle en cours, sauvegarde et s'arrête |
| **Kill switch** | `python main.py kill --reason "..."` | arrêt en moins d'une seconde, même pendant une reconnexion. Le **redémarrage est refusé** tant que `python main.py resume` n'a pas été lancé. |

Le kill switch est un simple fichier `state/KILL_SWITCH`. `touch state/KILL_SWITCH` fonctionne aussi, par exemple depuis un script ou une tâche cron.

À l'arrêt, une position ouverte est conservée et signalée : son stop n'est plus
surveillé tant que le bot est arrêté. En V3, les stops seront posés côté
plateforme pour pallier ce problème.

## Gestion du risque

Le risk manager (`tradebot/risk/manager.py`) est **indépendant de la
stratégie** et peut refuser n'importe quel signal :

```text
STRATEGY = BUY  →  RISK MANAGER = REJECT  →  FINAL ACTION = NO TRADE
```

**Taille de position** : on risque au plus `RISK_PER_TRADE_PCT` du capital entre
l'entrée et le stop, soit `quantité = risque / (entrée − stop)`. Le résultat est plafonné
par `MAX_POSITION_PCT` et par les liquidités, frais compris. Exemple avec
10 000 USDT, 1 % de risque et un stop à 2 % : 100 / 0,02 = 5 000 USDT, plafonné à
2 500 USDT (25 %).

**Une entrée est refusée si :**
- le trading est arrêté par le risk manager (drawdown max ou perte globale) ;
- la perte journalière maximale est atteinte ;
- les données sont absentes, invalides ou périmées, ou l'historique est insuffisant ;
- le prix est incohérent (nul, NaN) ou s'écarte de plus de `MAX_PRICE_DEVIATION_PCT` de la dernière clôture ;
- le signal arrive trop tard ;
- une position ou un ordre est déjà ouvert sur l'actif ;
- le nombre maximum de positions ou de trades du jour est atteint ;
- la taille calculée est inférieure à `MIN_ORDER_VALUE`.

Le PaperBroker applique ensuite ses propres contrôles : fonds insuffisants,
position inconnue, quantité invalide, stop ou objectif incohérents.

**Sorties** : elles restent autorisées même quand le trading est arrêté, car elles
réduisent le risque. Une vente sur une position inconnue est refusée.

**Arrêts** :

| Déclencheur | Portée | Levée |
|---|---|---|
| Perte journalière (`MAX_DAILY_LOSS_PCT`) | bloque les nouvelles entrées pour la journée | automatique le lendemain (UTC) |
| Drawdown (`MAX_DRAWDOWN_PCT`) ou perte globale (`MAX_TOTAL_LOSS_PCT`) | arrêt **verrouillé** des entrées, même si le capital remonte | manuelle, après analyse : bot arrêté puis `python main.py reset-halt` |
| `MAX_CONSECUTIVE_ERRORS` erreurs d'affilée (API instable…) | arrêt du processus (code de sortie 1) | relancer `python main.py run` |

## Stratégies

**V1 : `ema_cross_rsi`**, croisement de moyennes mobiles exponentielles filtré par le RSI, position longue uniquement :

| Signal | Condition |
|---|---|
| BUY | l'EMA rapide croise au-dessus de l'EMA lente **et** le RSI est sous `RSI_OVERBOUGHT` |
| SELL | l'EMA rapide croise sous l'EMA lente |
| HOLD | sinon, avec la raison : pas de croisement, suracheté, historique insuffisant |

Chaque signal porte l'action, le prix, l'horodatage, la stratégie, les
indicateurs et la raison. C'est une **hypothèse** : sur données synthétiques
aléatoires, elle perd de l'argent à cause des frais, ce qui est normal puisque ces données n'ont aucune structure exploitable.

**Ajouter une stratégie** (MACD, breakout, momentum… en V2) :

1. créer `tradebot/strategies/ma_strategie.py` avec une classe qui hérite de `Strategy`, définit `name` et `warmup`, et implémente `generate_signals()` et `params()` ;
2. l'enregistrer dans `STRATEGIES` (`tradebot/strategies/registry.py`) ;
3. lancer `pytest` : les tests anti look-ahead s'appliquent **automatiquement** à toute stratégie du registre.

## Structure du projet

```text
bot/
├── main.py                  CLI : check-config, download, backtest, optimize, run, status, kill, resume, reset-halt
├── .env.example             configuration commentée (copier en .env)
├── requirements*.txt, pyproject.toml
├── tradebot/
│   ├── config/              Settings (.env), validation, secrets masqués
│   ├── data/                MarketDataProvider (interface), CcxtProvider, CsvProvider, synthétique,
│   │                        validation des bougies, retrait de la bougie en cours, reconnexion
│   ├── indicators/          SMA, EMA, RSI, croisements (causaux)
│   ├── signals/             Action (BUY/SELL/HOLD) et Signal
│   ├── strategies/          Strategy (interface), registre, ema_cross_rsi
│   ├── risk/                RiskManager, sizing, limites, stop/objectif, kill switch
│   ├── execution/           BrokerInterface, PaperBroker, frais/spread/slippage, verrou du mode réel
│   ├── portfolio/           liquidités, positions, P&L, trades clôturés
│   ├── backtesting/         moteur, métriques, walk-forward, train/val/test, rapports
│   ├── paper_trading/       boucle temps réel, persistance atomique
│   ├── monitoring/          status.json + commande status
│   ├── journal/             logs (masquage des secrets) + journal JSONL des décisions
│   └── alerts/              Notifier (interface), LogNotifier, dispatcher
└── tests/                   145 tests (pytest)
```

Le dossier `logging/` suggéré s'appelle ici `journal/` : un paquet nommé
`logging` masquerait le module standard de Python.

## Tests

```bash
pytest                 # 145 tests, environ 2 secondes, sans aucun accès réseau
pytest -k lookahead    # un sous-ensemble
```

Les tests couvrent :
- les indicateurs et les signaux ;
- le look-ahead ;
- la taille de position, le stop-loss et le take-profit (y compris gap et stop et objectif dans la même bougie) ;
- les frais, le spread et le slippage ;
- le calcul du P&L et du drawdown, les métriques ;
- chaque motif de refus du risk manager et du broker ;
- le drawdown et la perte globale verrouillés, la perte journalière ;
- la reconnexion API avec délai croissant et l'arrêt après erreurs consécutives ;
- le kill switch (au démarrage et pendant l'exécution) ;
- l'état corrompu ou d'une autre configuration ;
- le refus du mode live ;
- le masquage des secrets dans les logs et les tracebacks ;
- la persistance et la reprise ;
- le walk-forward et la détection d'overfitting.

## Dépannage

| Symptôme | Cause probable et solution |
|---|---|
| `NetworkError … 451` ou `restricted location` | Binance est bloqué dans ton pays (ex. USA) : essaie `EXCHANGE=kraken` avec `SYMBOL=BTC/USD`, ou `EXCHANGE=bybit`. |
| `DataUnavailableError` répétés, puis arrêt | connexion internet ou plateforme indisponible. Relance plus tard ou augmente `MAX_CONSECUTIVE_ERRORS`. |
| `BadSymbol` | paire inexistante sur cette plateforme (`BTC/USDT` chez Binance, `BTC/USD` chez Kraken…). |
| `Configuration invalide` | le message liste chaque variable en cause. `python main.py check-config` aide à vérifier. |
| `Kill switch engagé` au démarrage | normal après un `kill` : analyse, puis `python main.py resume`. |
| `Fichier d'état illisible` / `correspond à …` | l'état ne correspond pas à la configuration (timeframe changé…). Remets l'ancienne configuration, ou supprime `state/paper_*.json` pour repartir de zéro. |
| Aucun ordre alors qu'il y a des signaux | vérifie `ENABLE_TRADING=true`, puis la colonne `RISK_REASONS` dans `logs/bot.log`. |
| `status` affiche INACTIF | le processus ne tourne plus : consulte la fin de `logs/bot.log`. |
| Backtest « Historique trop court » | augmente `--days` ou diminue `EMA_SLOW`. |
| Tourner 24/7 | sur un serveur, avec `systemd` (`Restart=on-failure`), `tmux` ou `nohup python main.py run &`. `systemctl stop` envoie SIGTERM, ce qui déclenche un arrêt propre. |

## Passage au mode réel (V3)

**Non disponible en V1.** Le broker réel ne sera développé qu'après ta
validation explicite, et seulement si le paper trading a tourné assez
longtemps (plusieurs semaines) avec des résultats cohérents avec le backtest
et le walk-forward.

Il faudra alors réunir **toutes** ces conditions :

1. un `LiveBroker` implémentant `BrokerInterface`, avec des stops posés **côté plateforme** ;
2. avant chaque ordre, la vérification de l'API, des permissions, du solde réel, de la quantité (pas et minimum de la plateforme), du prix, du stop, des limites de risque, de l'absence d'ordre déjà ouvert et de la cohérence de la réponse du broker. Le bot refusera automatiquement l'ordre si l'une de ces vérifications échoue ;
3. une clé API **sans droit de retrait**, limitée au trading spot, et restreinte à l'adresse IP du serveur si la plateforme le permet ;
4. `MODE=live`, `ENABLE_TRADING=true`, les clés dans `.env`, et `LIVE_TRADING_CONFIRMATION=JE_COMPRENDS_QUE_JE_PEUX_PERDRE_DE_L_ARGENT` ;
5. des limites de risque strictes et un petit capital pour commencer.

## Feuille de route

- **V1 (ce dépôt)** : une source de données, un actif, un timeframe, une stratégie, le backtest, le walk-forward, la gestion du risque, le paper trading, les logs, le monitoring en ligne de commande et les tests.
- **V2** : plusieurs stratégies (MACD, breakout, momentum), plusieurs actifs, un dashboard web, des alertes Telegram, Discord et email, des données en websocket.
- **V3** : un broker réel, uniquement après validation, avec des limites de risque strictes.
