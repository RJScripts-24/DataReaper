from __future__ import annotations

import json as _json
import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from datareaper.core.logging import get_logger
from datareaper.integrations.browser.playwright_client import PlaywrightClient
from datareaper.integrations.llm.base import BaseLLMClient
from datareaper.integrations.llm.prompt_loader import load_prompt
from datareaper.utils.storage import upload_evidence

LOCATION_REGEX = re.compile(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s([A-Z][a-z]+)\b")
EMPLOYER_REGEX = re.compile(
    r"(?:works\s+at|company)\s*[:\-]?\s*([A-Za-z0-9&.,\- ]{2,80})",
    re.IGNORECASE,
)
EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

logger = get_logger(__name__)


def _confidence(name: str | None, location: str | None, employer: str | None) -> float:
    score = 0.0
    if name:
        score += 0.45
    if location:
        score += 0.35
    if employer:
        score += 0.15
    return min(score, 0.95)


def _extract_og_data(soup) -> dict:
    og: dict = {}
    for prop in [
        "og:title",
        "og:description",
        "og:image",
        "og:url",
        "profile:username",
    ]:
        tag = soup.find("meta", attrs={"property": prop})
        if tag and tag.get("content"):
            og[prop.split(":")[-1]] = str(tag["content"]).strip()
    return og


def _extract_jsonld(soup) -> dict:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            raw = tag.string or tag.get_text() or ""
            data = _json.loads(raw)
            if not isinstance(data, dict):
                continue
            if data.get("@type") in ("Person", "ProfilePage", "WebPage"):
                same_as = data.get("sameAs") or []
                if isinstance(same_as, str):
                    same_as = [same_as]

                works_for_value = data.get("worksFor") or {}
                if isinstance(works_for_value, dict):
                    works_for = works_for_value.get("name")
                else:
                    works_for = works_for_value

                image_value = data.get("image")
                image = image_value.get("url") if isinstance(image_value, dict) else image_value

                location_value = (
                    data.get("location") or data.get("homeLocation") or data.get("address")
                )
                if isinstance(location_value, dict):
                    location_value = (
                        location_value.get("name")
                        or location_value.get("addressLocality")
                        or location_value.get("addressRegion")
                    )

                return {
                    "name": data.get("name"),
                    "url": data.get("url"),
                    "same_as": [str(u) for u in same_as if u],
                    "works_for": works_for,
                    "job_title": data.get("jobTitle"),
                    "description": data.get("description"),
                    "image": image,
                    "location": location_value,
                }
        except Exception:
            continue
    return {}


def _extract_social_meta(soup) -> dict:
    handles: dict = {}
    for name in ["twitter:creator", "twitter:site", "article:author"]:
        tag = soup.find("meta", attrs={"name": name}) or soup.find("meta", attrs={"property": name})
        if tag and tag.get("content"):
            handles[name.split(":")[-1]] = str(tag["content"]).strip()
    return handles


def _extract_from_html(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    og = _extract_og_data(soup)
    jsonld = _extract_jsonld(soup)
    social = _extract_social_meta(soup)

    og_title = og.get("title")
    h1 = soup.find("h1")
    raw_name = (
        jsonld.get("name")
        or (og_title if og_title and len(og_title) < 80 else None)
        or (h1.get_text(strip=True) if h1 else None)
    )

    text_blob = soup.get_text(" ", strip=True)
    location_match = LOCATION_REGEX.search(text_blob)
    location = jsonld.get("location") or (
        ", ".join(location_match.groups()) if location_match else None
    )

    employer = jsonld.get("works_for")
    if not employer:
        company_meta = soup.find("meta", attrs={"name": "company"})
        if company_meta:
            employer = company_meta.get("content")
        else:
            employer_match = EMPLOYER_REGEX.search(text_blob)
            if employer_match:
                employer = employer_match.group(1).strip()

    return {
        "name": raw_name,
        "location": location,
        "employer": employer or jsonld.get("works_for"),
        "job_title": jsonld.get("job_title"),
        "emails": sorted(set(EMAIL_REGEX.findall(text_blob))),
        "same_as_urls": jsonld.get("same_as", []),
        "social_handles": social,
        "image_url": jsonld.get("image") or og.get("image"),
    }


def _extract_usernames_from_url(url: str) -> list[str]:
    parsed = urlparse(url)
    parts = [part for part in parsed.path.split("/") if part]
    usernames = [part for part in parts if re.fullmatch(r"[A-Za-z0-9_.-]{3,}", part)]
    return usernames[:5]


async def _extract_with_llm(url: str, html: str, llm: BaseLLMClient | None) -> dict:
    if llm is None:
        return {}

    system = load_prompt("sleuth_identity.md")
    prompt = (
        "Extract profile attributes from this public page HTML snippet. "
        "Return strict JSON with keys: name, location, employer, confidence, emails, usernames. "
        "Use confidence between 0 and 1.\n\n"
        f"URL: {url}\n"
        f"HTML_SNIPPET:\n{html[:12000]}"
    )
    try:
        payload = await llm.generate_json(prompt=prompt, system=system, max_tokens=512)
        return payload if isinstance(payload, dict) else {}
    except Exception as exc:  # pragma: no cover - provider/network failures
        logger.warning("profile_llm_extraction_failed", url=url, error=str(exc))
        return {}


async def scrape_profile(
    url: str,
    browser: PlaywrightClient,
    llm: BaseLLMClient | None = None,
) -> dict:
    result = await browser.fetch(url)
    html = result.get("html") or ""
    if not html:
        return {
            "name": None,
            "location": None,
            "employer": None,
            "job_title": None,
            "confidence": 0.0,
            "evidence_url": None,
            "url": url,
            "discovered_emails": [],
            "discovered_usernames": _extract_usernames_from_url(url),
            "same_as_urls": [],
            "social_handles": {},
            "image_url": None,
        }

    fast = _extract_from_html(html)
    name = fast.get("name")
    location = fast.get("location")
    employer = fast.get("employer")
    job_title = fast.get("job_title")
    discovered_emails = list(fast.get("emails") or [])
    discovered_usernames = _extract_usernames_from_url(url)
    same_as_urls = list(fast.get("same_as_urls") or [])
    social_handles = dict(fast.get("social_handles") or {})
    image_url = fast.get("image_url")

    confidence = _confidence(name, location, employer)
    if confidence < 0.8:
        llm_payload = await _extract_with_llm(url, html, llm)
        name = name or llm_payload.get("name")
        location = location or llm_payload.get("location")
        employer = employer or llm_payload.get("employer")

        llm_confidence = llm_payload.get("confidence")
        if isinstance(llm_confidence, (float, int)):
            confidence = max(confidence, min(float(llm_confidence), 1.0))
        else:
            confidence = max(confidence, _confidence(name, location, employer))

        llm_emails = llm_payload.get("emails") or []
        if isinstance(llm_emails, list):
            discovered_emails = sorted(
                {*discovered_emails, *[str(item) for item in llm_emails if item]}
            )

        llm_usernames = llm_payload.get("usernames") or []
        if isinstance(llm_usernames, list):
            discovered_usernames = sorted(
                {
                    *discovered_usernames,
                    *[str(item) for item in llm_usernames if item],
                }
            )

        llm_same_as = llm_payload.get("same_as_urls") or []
        if isinstance(llm_same_as, list):
            same_as_urls = sorted({*same_as_urls, *[str(item) for item in llm_same_as if item]})

        llm_job_title = llm_payload.get("job_title")
        if llm_job_title and not job_title:
            job_title = str(llm_job_title)

        llm_social = llm_payload.get("social_handles") or {}
        if isinstance(llm_social, dict):
            social_handles = {
                **social_handles,
                **{str(k): str(v) for k, v in llm_social.items() if v},
            }

        llm_image = llm_payload.get("image_url")
        if llm_image and not image_url:
            image_url = str(llm_image)

    evidence_url = None
    if confidence > 0.8 and (name or location):
        screenshot = await browser.capture_screenshot(url)
        if screenshot:
            parsed = urlparse(url)
            host = (parsed.netloc or "profile").replace(":", "-")
            filename = f"{host}-evidence.png"
            try:
                evidence_url = await upload_evidence(screenshot, filename, "image/png")
            except Exception as exc:  # pragma: no cover - external storage failures
                logger.warning("profile_evidence_upload_failed", url=url, error=str(exc))

    return {
        "name": name,
        "location": location,
        "employer": employer,
        "job_title": job_title,
        "confidence": round(confidence, 4),
        "evidence_url": evidence_url,
        "url": url,
        "discovered_emails": discovered_emails,
        "discovered_usernames": discovered_usernames,
        "same_as_urls": same_as_urls,
        "social_handles": social_handles,
        "image_url": image_url,
    }
