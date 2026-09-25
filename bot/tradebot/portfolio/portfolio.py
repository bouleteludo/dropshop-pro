from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Mapping, Optional

EPSILON = 1e-9


class PortfolioError(RuntimeError):
    pass


@dataclass
class Position:
    symbol: str
    quantity: float
    entry_price: float  # prix d'exécution réel (spread + slippage inclus)
    entry_fee: float
    opened_at: int
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

    def market_value(self, price: float) -> float:
        return self.quantity * price

    def unrealized_pnl(self, price: float) -> float:
        """P&L latent net des frais d'entrée (les frais de sortie ne sont pas encore payés)."""
        return (price - self.entry_price) * self.quantity - self.entry_fee


@dataclass(frozen=True)
class ClosedTrade:
    symbol: str
    quantity: float
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    entry_fee: float
    exit_fee: float
    exit_reason: str

    @property
    def gross_pnl(self) -> float:
        return (self.exit_price - self.entry_price) * self.quantity

    @property
    def fees(self) -> float:
        return self.entry_fee + self.exit_fee

    @property
    def net_pnl(self) -> float:
        return self.gross_pnl - self.fees

    @property
    def return_pct(self) -> float:
        invested = self.entry_price * self.quantity + self.entry_fee
        return 100 * self.net_pnl / invested if invested else 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d.update(gross_pnl=self.gross_pnl, net_pnl=self.net_pnl, return_pct=self.return_pct)
        return d


@dataclass
class Portfolio:
    """Comptabilité du compte : liquidités, positions ouvertes, trades clôturés."""

    initial_cash: float
    cash: float = field(default=None)  # type: ignore[assignment]
    positions: dict[str, Position] = field(default_factory=dict)
    closed_trades: list[ClosedTrade] = field(default_factory=list)
    fees_paid: float = 0.0

    def __post_init__(self):
        if self.cash is None:
            self.cash = self.initial_cash

    @property
    def realized_pnl(self) -> float:
        return sum(t.net_pnl for t in self.closed_trades)

    def open_position(
        self,
        symbol: str,
        quantity: float,
        price: float,
        fee: float,
        time: int,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> Position:
        if symbol in self.positions:
            raise PortfolioError(f"position déjà ouverte sur {symbol}")
        cost = quantity * price + fee
        if cost > self.cash + EPSILON:
            raise PortfolioError(f"fonds insuffisants : {cost:.2f} requis, {self.cash:.2f} disponibles")
        self.cash -= cost
        self.fees_paid += fee
        position = Position(symbol, quantity, price, fee, time, stop_loss, take_profit)
        self.positions[symbol] = position
        return position

    def close_position(self, symbol: str, price: float, fee: float, time: int, reason: str) -> ClosedTrade:
        position = self.positions.pop(symbol, None)
        if position is None:
            raise PortfolioError(f"aucune position ouverte sur {symbol}")
        self.cash += position.quantity * price - fee
        self.fees_paid += fee
        trade = ClosedTrade(
            symbol=symbol,
            quantity=position.quantity,
            entry_time=position.opened_at,
            exit_time=time,
            entry_price=position.entry_price,
            exit_price=price,
            entry_fee=position.entry_fee,
            exit_fee=fee,
            exit_reason=reason,
        )
        self.closed_trades.append(trade)
        return trade

    def equity(self, prices: Mapping[str, float]) -> float:
        """Valeur liquidative : liquidités + positions au prix courant."""
        return self.cash + sum(p.market_value(prices.get(s, p.entry_price)) for s, p in self.positions.items())

    def unrealized_pnl(self, prices: Mapping[str, float]) -> float:
        return sum(p.unrealized_pnl(prices.get(s, p.entry_price)) for s, p in self.positions.items())

    def to_dict(self) -> dict:
        return {
            "initial_cash": self.initial_cash,
            "cash": self.cash,
            "fees_paid": self.fees_paid,
            "positions": {s: asdict(p) for s, p in self.positions.items()},
            "closed_trades": [asdict(t) for t in self.closed_trades],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Portfolio":
        return cls(
            initial_cash=data["initial_cash"],
            cash=data["cash"],
            fees_paid=data.get("fees_paid", 0.0),
            positions={s: Position(**p) for s, p in data.get("positions", {}).items()},
            closed_trades=[ClosedTrade(**t) for t in data.get("closed_trades", [])],
        )
