from datareaper.osint.identity_resolver import resolve_identity


def test_identity_resolution() -> None:
    result = resolve_identity([{"name": "John Doe"}, {"location": "Bangalore"}])
    assert result["name"] == "John Doe"
