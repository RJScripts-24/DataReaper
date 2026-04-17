from __future__ import annotations

from datareaper.comms.attachment_handler import extract_form_url
from datareaper.comms.gmail_client import get_gmail_client
from datareaper.comms.reply_generator import build_reply, build_reply_with_llm
from datareaper.comms.sync import sync_inbox_for_scan
from datareaper.legal.form_mapper import build_field_map


async def sync_inbox(ctx: dict, scan_id: str) -> dict:
    llm = ctx.get("llm")
    battle_repo = ctx.get("battle_repo")
    queue = ctx.get("queue")
    browser = ctx.get("browser")
    if battle_repo is None:
        return {"scan_id": scan_id, "status": "skipped", "reason": "missing_battle_repo"}

    updates = await sync_inbox_for_scan(scan_id=scan_id, battle_repo=battle_repo, llm=llm)
    gmail = get_gmail_client()

    active_count = 0
    for update in updates:
        intent = update.get("intent")
        thread_id = update.get("thread_id")
        recipient = update.get("broker_email") or "privacy@broker.example"
        jurisdiction = update.get("jurisdiction") or "DPDP"
        if intent in {"stalling", "illegal_pushback", "legal_violation"}:
            if llm is not None:
                reply = await build_reply_with_llm(
                    intent=intent,
                    jurisdiction=jurisdiction,
                    broker_reply=str(update.get("body") or ""),
                    history=update.get("history") or [],
                    days_elapsed=int(update.get("days_elapsed", 0)),
                    evidence_url=update.get("evidence_url"),
                    llm=llm,
                )
            else:
                reply = build_reply(intent, jurisdiction)
            gmail.send_message(
                to=recipient,
                subject="Re: Data Deletion Request",
                body=reply,
                thread_id=thread_id,
            )
            active_count += 1
        elif intent == "form_request":
            broker_reply = update.get("body") or ""
            form_url = extract_form_url(broker_reply) or update.get("opt_out_url")
            if browser is not None:
                if form_url:
                    form_page = await browser.fetch(form_url)
                    form_html = str(form_page.get("html") or "")
                    field_map = build_field_map(
                        update.get("broker_name") or "",
                        update.get("identity") or {},
                        form_html,
                    )
                    if field_map:
                        await browser.fill_form_and_submit(
                            form_url,
                            field_map,
                            "button[type='submit'],input[type='submit']",
                        )
            gmail.send_message(
                to=recipient,
                subject="Re: Data Deletion Request Form",
                body=(
                    "We will submit only minimal required fields using previously provided "
                    "information. No additional sensitive documents will be provided."
                ),
                thread_id=thread_id,
            )
            active_count += 1

    if active_count > 0 and queue is not None:
        await queue.enqueue_in("sync_inbox", delay_seconds=300, scan_id=scan_id)
    return {"scan_id": scan_id, "status": "ok", "updates": len(updates), "active": active_count}


def run(scan_id: str) -> dict:
    return {"job": "sync_inbox", "scan_id": scan_id, "status": "queued"}
