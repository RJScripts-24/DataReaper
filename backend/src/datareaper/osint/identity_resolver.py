from __future__ import annotations

import json
from collections import Counter

from datareaper.core.logging import get_logger
from datareaper.integrations.llm.base import BaseLLMClient
from datareaper.integrations.llm.prompt_loader import load_prompt

logger = get_logger(__name__)


async def resolve_identity(scraped_profiles: list[dict], llm: BaseLLMClient | None) -> dict:
    if not scraped_profiles:
        return {"real_name": None, "location": None, "employer": None}

    prompt_payload = json.dumps(scraped_profiles, ensure_ascii=True)
    system = load_prompt("sleuth_identity.md")
    prompt = (
        "Given these scraped profiles, synthesize the most likely identity profile.\n\n"
        "Profiles:\n"
        f"{prompt_payload}"
    )
    if llm is not None:
        try:
            resolved = await llm.generate_json(prompt=prompt, system=system)
            if isinstance(resolved, dict):
                return resolved
        except Exception as exc:  # pragma: no cover - provider failures should fall back
            logger.warning("identity_resolution_llm_failed", error=str(exc))

    names = Counter(str(row.get("name")) for row in scraped_profiles if row.get("name"))
    locations = Counter(str(row.get("location")) for row in scraped_profiles if row.get("location"))
    employers = Counter(str(row.get("employer")) for row in scraped_profiles if row.get("employer"))
    return {
        "real_name": names.most_common(1)[0][0] if names else None,
        "location": locations.most_common(1)[0][0] if locations else None,
        "employer": employers.most_common(1)[0][0] if employers else None,
        "sources": scraped_profiles,
    }
