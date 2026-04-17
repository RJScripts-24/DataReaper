from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AgentResult:
    agent: str
    status: str
    payload: dict


class BaseAgent:
    name = "base"

    def run(self, context: dict) -> AgentResult:
        return AgentResult(agent=self.name, status="ok", payload=context)
