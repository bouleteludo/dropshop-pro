from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path


class KillSwitch:
    """Arrêt d'urgence par fichier.

    `python main.py kill` crée le fichier ; le bot le vérifie au moins une
    fois par seconde et s'arrête proprement. Tant que le fichier existe, le
    bot refuse de redémarrer : il faut `python main.py resume` pour le lever.
    On peut aussi créer le fichier à la main (touch state/KILL_SWITCH).
    """

    def __init__(self, path: Path):
        self.path = path

    def engaged(self) -> bool:
        return self.path.exists()

    def reason(self) -> str:
        try:
            return self.path.read_text().strip() or "(sans raison)"
        except OSError:
            return "(illisible)"

    def engage(self, reason: str = "arrêt manuel") -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        self.path.write_text(f"{stamp} | {reason}\n")

    def release(self) -> bool:
        try:
            self.path.unlink()
            return True
        except FileNotFoundError:
            return False
