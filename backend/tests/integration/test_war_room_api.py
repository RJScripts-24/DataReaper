from fastapi.testclient import TestClient

from datareaper.main import app


def test_war_room_api() -> None:
    client = TestClient(app)
    response = client.get("/api/war-room/demo")
    assert response.status_code == 200
