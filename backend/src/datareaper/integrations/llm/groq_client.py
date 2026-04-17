from __future__ import annotations

from groq import AsyncGroq
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from datareaper.core.config import get_settings
from datareaper.core.exceptions import LLMProviderError
from datareaper.core.logging import get_logger
from datareaper.integrations.llm.base import BaseLLMClient

logger = get_logger(__name__)


class GroqClient(BaseLLMClient):
    def __init__(self, model: str = "llama-3.3-70b-versatile") -> None:
        settings = get_settings()
        self.model_name = model or settings.groq_model
        self.api_key = settings.groq_api_key
        self._client = AsyncGroq(api_key=self.api_key) if self.api_key else None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(LLMProviderError),
        reraise=True,
    )
    async def generate(self, prompt: str, system: str = "", max_tokens: int = 2048) -> str:
        logger.debug(
            "groq_generation_start",
            model=self.model_name,
            prompt_char_count=len(prompt),
            max_tokens=max_tokens,
        )

        if self._client is None:
            raise LLMProviderError("Groq API key is not configured")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.1,
            )
        except Exception as exc:  # pragma: no cover - provider/client runtime failure
            raise LLMProviderError("Groq API call failed") from exc

        choices = getattr(response, "choices", [])
        if not choices:
            raise LLMProviderError("Groq returned no choices")

        message = choices[0].message
        content = getattr(message, "content", None)
        if isinstance(content, list):
            chunks = []
            for item in content:
                if isinstance(item, dict):
                    text_chunk = item.get("text")
                    if isinstance(text_chunk, str):
                        chunks.append(text_chunk)
                else:
                    text_chunk = getattr(item, "text", None)
                    if isinstance(text_chunk, str):
                        chunks.append(text_chunk)
            content = "".join(chunks).strip()

        if not isinstance(content, str) or not content.strip():
            raise LLMProviderError("Groq returned empty content")

        return content
