from __future__ import annotations


def resolve_jurisdiction(country_code: str) -> str:
    mapping = {"IN": "DPDP", "DE": "GDPR", "FR": "GDPR", "US": "CCPA"}
    return mapping.get(country_code.upper(), "DPDP")
