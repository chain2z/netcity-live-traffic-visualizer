from pydantic import TypeAdapter

from app.model.messages import FailureReason, Snapshot, SourceStatus, WSMessage


def test_snapshot_serializes_status_and_empty_state() -> None:
    snapshot = Snapshot(
        sourceStatus=SourceStatus(
            mode="MOCK",
            failureReason=FailureReason.INSUFFICIENT_PRIVILEGES,
            message="Live capture requires administrator/root privileges.",
        ),
        devices=[],
        connections=[],
    )

    data = snapshot.model_dump(mode="json")
    parsed = TypeAdapter(WSMessage).validate_python(data)

    assert data["type"] == "snapshot"
    assert parsed.sourceStatus.failureReason == FailureReason.INSUFFICIENT_PRIVILEGES
