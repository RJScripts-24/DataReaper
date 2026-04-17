from __future__ import annotations

from datareaper.agents.base import AgentResult, BaseAgent


class SleuthAgent(BaseAgent):
    name = "sleuth"

    def run(self, context: dict) -> AgentResult:
        context = {**context, "stage": "osint", "message": "Sleuth Agent mapped exposure surface"}
        return AgentResult(agent=self.name, status="ok", payload=context)
