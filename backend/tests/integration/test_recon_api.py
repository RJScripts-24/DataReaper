from fastapi.testclient import TestClient

from datareaper.main import app


def test_recon_api() -> None:
    client = TestClient(app)
    response = client.get("/api/recon/demo/graph")
    assert response.status_code == 200
