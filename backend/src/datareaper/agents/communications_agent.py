from __future__ import annotations

from datareaper.agents.base import AgentResult, BaseAgent
from datareaper.comms.reply_generator import build_reply


class CommunicationsAgent(BaseAgent):
    name = "communications"

    def run(self, context: dict) -> AgentResult:
        context = {**context, "reply": build_reply(context.get("intent", "in_progress"), context.get("jurisdiction", "DPDP"))}
        return AgentResult(agent=self.name, status="ok", payload=context)
