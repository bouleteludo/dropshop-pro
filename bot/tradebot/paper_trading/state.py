from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Optional

STATE_VERSION = 1


class StateError(RuntimeError):
    pass


def atomic_write_json(path: Path, data: dict) -> None:
    """Écrit dans un fichier temporaire puis le renomme : un crash pendant
    l'écriture ne laisse jamais un fichier d'état à moitié écrit."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


class StateStore:
    """Persistance de l'état du paper trading (portefeuille, risque, dernière
    bougie traitée) pour reprendre exactement là où le bot s'est arrêté."""

    def __init__(self, path: Path):
        self.path = path

    def load(self) -> Optional[dict]:
        if not self.path.exists():
            return None
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            # Mieux vaut refuser de démarrer que de repartir avec une position inconnue.
            raise StateError(f"Fichier d'état illisible ({self.path}) : {exc}") from exc
        if data.get("version") != STATE_VERSION:
            raise StateError(f"Version d'état non supportée dans {self.path} : {data.get('version')}")
        return data

    def save(self, data: dict) -> None:
        atomic_write_json(self.path, {"version": STATE_VERSION, **data})
