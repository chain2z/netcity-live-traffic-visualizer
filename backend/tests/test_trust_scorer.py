from app.analysis.trust_scorer import score_device
from app.model.domain import Connection, Device


def test_tracker_connections_lower_score() -> None:
    device = Device(id="dev1", ip="192.168.1.2", firstSeen=1, lastSeen=2)
    connections = [
        Connection(
            id="c1",
            srcDeviceId="dev1",
            dstIp="34.117.59.81",
            dstHost="api.segment.io",
            protocol="TCP",
            port=443,
            bytes=1000,
            packetCount=4,
            lastSeen=2,
        )
    ]

    score = score_device(device, connections, {"api.segment.io"})

    assert score.knownTracker > 0
    assert score.destinationReputation > 0
    assert score.finalScore < 100


def test_no_connections_keeps_score_high() -> None:
    device = Device(id="dev1", ip="192.168.1.2", firstSeen=1, lastSeen=2)

    score = score_device(device, [], set())

    assert score.finalScore == 100
