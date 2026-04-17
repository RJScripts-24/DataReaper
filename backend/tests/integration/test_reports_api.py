from fastapi.testclient import TestClient

from datareaper.main import app


def test_reports_api() -> None:
    client = TestClient(app)
    response = client.get("/api/reports/demo")
    assert response.status_code == 200
