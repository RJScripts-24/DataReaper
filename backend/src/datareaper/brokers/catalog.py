from __future__ import annotations

from pathlib import Path

from datareaper.core.config import get_settings
import yaml


def load_broker_catalog() -> dict:
    settings = get_settings()
    return yaml.safe_load(Path(settings.data_dir / "brokers" / "broker_catalog.yaml").read_text(encoding="utf-8"))
