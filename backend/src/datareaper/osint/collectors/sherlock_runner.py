from __future__ import annotations

import asyncio
from urllib.parse import urlparse

from datareaper.integrations.browser.playwright_client import PlaywrightClient
from datareaper.integrations.sherlock.adapter import run_sherlock

_NEGATIVE_MARKERS: dict[str, tuple[str, ...]] = {
    "reddit": (
        "sorry, nobody on reddit goes by that name",
        "this account may have been banned or the username is incorrect",
    ),
    "github": (
        "not found · github",
        "there isn't a github pages site here",
    ),
    "instagram": (
        "sorry, this page isn't available",
    ),
    "x": (
        "this account doesn't exist",
    ),
    "twitter": (
        "this account doesn\u2019t exist",
        "this account doesn't exist",
    ),
    "linkedin": (
        "profile unavailable",
        "an exact match for",
    ),
}


def _canonical_site(site: str | None, url: str) -> str:
    raw = (site or "").strip().lower()
    if raw:
        return raw
    host = urlparse(url).netloc.lower()
    if "reddit.com" in host:
        return "reddit"
    if "github.com" in host:
        return "github"
    if "instagram.com" in host:
        return "instagram"
    if "linkedin.com" in host:
        return "linkedin"
    if "x.com" in host:
        return "x"
    if "twitter.com" in host:
        return "twitter"
    return host


async def _is_likely_live_profile(browser: PlaywrightClient, row: dict) -> bool:
    url = str(row.get("url") or "").strip()
    if not url:
        return False

    site = _canonical_site(str(row.get("site") or ""), url)

    try:
        # Use stealth Playwright fetch to reduce anti-bot false negatives.
        result = await browser.fetch(url)
        status = result.get("status")
        if status in (404, 410):
            return False

        page_text = str(result.get("html", "")).lower()
        markers = _NEGATIVE_MARKERS.get(site, ())
        return not any(marker in page_text for marker in markers)
    except Exception:
        # Keep inconclusive rows to avoid false negatives on transient network failures.
        return True


async def discover_profiles_via_sherlock(usernames: list[str], browser: PlaywrightClient) -> list[dict]:
    if not usernames:
        return []

    runs = await asyncio.gather(
        *[run_sherlock(username) for username in usernames],
        return_exceptions=True,
    )

    deduped: dict[str, dict] = {}
    for username, result in zip(usernames, runs, strict=False):
        if isinstance(result, Exception):
            continue
        for row in result:
            url = str(row.get("url") or "").strip()
            if not url:
                continue
            deduped[url] = {
                "site": row.get("site"),
                "url": url,
                "username": username,
            }

    if not deduped:
        return []

    checks = await asyncio.gather(
        *[_is_likely_live_profile(browser, row) for row in deduped.values()],
        return_exceptions=True,
    )

    validated: list[dict] = []
    for row, check in zip(deduped.values(), checks, strict=False):
        if isinstance(check, Exception):
            continue
        if check:
            validated.append(row)
    return validated
