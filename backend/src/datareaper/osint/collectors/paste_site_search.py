from __future__ import annotations

from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from datareaper.core.logging import get_logger
from datareaper.integrations.browser.playwright_client import PlaywrightClient

logger = get_logger(__name__)

PASTE_SEARCH_TEMPLATES = [
    "https://gist.github.com/search?q={query}",
    "https://www.reddit.com/search/?q={query}&type=comment",
]


async def search_paste_sites(seed: str, browser: PlaywrightClient) -> list[str]:
    encoded = quote_plus(seed)
    found: set[str] = set()

    for template in PASTE_SEARCH_TEMPLATES:
        url = template.format(query=encoded)
        try:
            result = await browser.fetch(url)
            html = str(result.get("html") or "")
            soup = BeautifulSoup(html, "html.parser")
            for anchor in soup.select("a[href]"):
                href = str(anchor.get("href") or "")
                if href.startswith("http") and seed.lower() in html.lower():
                    found.add(href)
        except Exception as exc:
            logger.warning("paste_search_failed", url=url, error=str(exc))

    logger.info("paste_search_complete", seed=seed[:30], hits=len(found))
    return sorted(found)
