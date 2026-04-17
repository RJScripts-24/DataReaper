from __future__ import annotations

from datareaper.legal.citation_builder import build_citations


def build_notice(jurisdiction: str, seed: str) -> str:
    citations = ", ".join(build_citations(jurisdiction))
    return f"Please delete all personal data associated with {seed}. Legal basis: {citations}."
