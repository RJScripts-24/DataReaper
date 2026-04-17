from fastapi.testclient import TestClient

from datareaper.main import app


def build_test_client() -> TestClient:
    return TestClient(app)
