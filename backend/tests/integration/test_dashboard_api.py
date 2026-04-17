from fastapi.testclient import TestClient

from datareaper.main import app


def test_dashboard_api() -> None:
    client = TestClient(app)
    response = client.get("/api/dashboard/demo")
    assert response.status_code == 200
