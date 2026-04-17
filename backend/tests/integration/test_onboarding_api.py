from fastapi.testclient import TestClient

from datareaper.main import app


def test_onboarding_api() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/onboarding/initialize",
            json={
                "seed": "user@email.com",
                "seed_type": "email",
                "jurisdiction": "DPDP",
                "consent_confirmed": True,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload.get("scan_id")
