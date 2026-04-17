from __future__ import annotations


def map_form_fields(identity: dict) -> dict:
    return {"name": identity.get("name"), "location": identity.get("location")}
