from app.security import (
    configured_allowed_origins,
    is_allowed_origin,
    is_local_client_host,
)


def test_local_client_hosts_are_allowed() -> None:
    assert is_local_client_host("127.0.0.1")
    assert is_local_client_host("::1")
    assert is_local_client_host("localhost")


def test_non_loopback_clients_are_rejected_by_default() -> None:
    assert not is_local_client_host("192.168.1.25")
    assert not is_local_client_host("8.8.8.8")


def test_default_allowed_origins_are_exact() -> None:
    allowed = configured_allowed_origins()

    assert is_allowed_origin("http://localhost:5173", allowed)
    assert is_allowed_origin("http://127.0.0.1:5173", allowed)
    assert not is_allowed_origin("https://evil.example", allowed)
