from __future__ import annotations


class BaseLLMClient:
    def generate(self, prompt: str) -> str:
        return prompt
