from fastapi.testclient import TestClient

from datareaper.main import app


def test_email_battle_flow() -> None:
    client = TestClient(app)
    assert client.get("/api/war-room/demo").status_code == 200
    assert client.get("/api/war-room/targets/1/thread").status_code == 200
