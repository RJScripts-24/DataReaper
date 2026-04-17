from __future__ import annotations

import asyncio

from datareaper.agents.base import AgentResult, BaseAgent
from datareaper.osint.account_discovery import discover_accounts
from datareaper.osint.collectors.profile_scraper import scrape_profile
from datareaper.osint.graph_builder import build_graph
from datareaper.osint.identity_resolver import resolve_identity
from datareaper.osint.username_discovery import discover_usernames


class SleuthAgent(BaseAgent):
    name = "sleuth"

    async def run(self, context: dict) -> AgentResult:
        seed = context.get("seed", "")
        browser = context.get("browser")
        if not seed:
            return AgentResult(agent=self.name, status="error", payload=context, error="missing_seed")

        accounts = await discover_accounts(seed)
        usernames = await discover_usernames(accounts, original_seeds=[seed])
        profiles: list[dict] = []
        if browser is not None:
            profile_urls = [row.get("url") for row in accounts if row.get("url")]
            profiles = await asyncio.gather(
                *[scrape_profile(url, browser, self.llm) for url in profile_urls],
                return_exceptions=False,
            )

        if self.llm is not None:
            identity = await resolve_identity(profiles, self.llm)
        else:
            identity = {"real_name": None, "location": None}

        targets = [row.get("broker_name") for row in context.get("targets", []) if isinstance(row, dict)]
        graph = build_graph(
            seed,
            [str(row.get("platform") or "unknown") for row in accounts],
            [str(target) for target in targets if target],
            usernames,
            {"name": identity.get("real_name") or identity.get("name"), "location": identity.get("location")},
        )

        payload = {
            **context,
            "accounts": accounts,
            "usernames": usernames,
            "identity": identity,
            "graph": graph,
            "stage": "osint",
        }
        return AgentResult(agent=self.name, status="ok", payload=payload)
