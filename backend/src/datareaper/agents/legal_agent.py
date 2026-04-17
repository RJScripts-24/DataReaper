from __future__ import annotations

from datareaper.agents.base import AgentResult, BaseAgent
from datareaper.legal.notice_builder import build_notice


class LegalAgent(BaseAgent):
    name = "legal"

    def run(self, context: dict) -> AgentResult:
        context = {**context, "notice": build_notice(context.get("jurisdiction", "DPDP"), context.get("seed", "user@email.com"))}
        return AgentResult(agent=self.name, status="ok", payload=context)
