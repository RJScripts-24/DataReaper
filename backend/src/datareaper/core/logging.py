from __future__ import annotations

import logging

try:
    import structlog
except Exception:  # pragma: no cover - local fallback
    structlog = None


def configure_logging(level: str = "INFO") -> None:
    resolved_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=resolved_level)
    if structlog is not None:
        structlog.configure(
            wrapper_class=structlog.make_filtering_bound_logger(resolved_level),
            logger_factory=structlog.PrintLoggerFactory(),
        )


def get_logger(name: str):
    if structlog is not None:
        return structlog.get_logger(name)
    return logging.getLogger(name)
