from __future__ import annotations

from copy import deepcopy


class InMemoryStore:
    def __init__(self) -> None:
        self._scans: dict[str, dict] = {}
        self._target_index: dict[str, str] = {}

    def save_scan_bundle(self, bundle: dict) -> None:
        scan_id = bundle["scan"]["id"]
        self._scans[scan_id] = deepcopy(bundle)
        for target in bundle.get("targets", []):
            self._target_index[target["id"]] = scan_id

    def get_scan_bundle(self, scan_id: str) -> dict | None:
        bundle = self._scans.get(scan_id)
        return deepcopy(bundle) if bundle else None

    def list_scan_ids(self) -> list[str]:
        return list(self._scans.keys())

    def get_thread(self, target_id: str) -> dict | None:
        scan_id = self._target_index.get(target_id)
        if scan_id is None:
            return None
        bundle = self._scans.get(scan_id, {})
        thread = bundle.get("threads", {}).get(target_id)
        return deepcopy(thread) if thread else None


memory_store = InMemoryStore()
