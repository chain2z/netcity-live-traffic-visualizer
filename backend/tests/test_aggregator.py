from app.analysis.aggregator import Aggregator
from app.model.domain import TrafficEvent


def test_ingest_rolls_events_into_devices_and_connections() -> None:
    aggregator = Aggregator(blocklist={"api.segment.io"})

    aggregator.ingest(
        TrafficEvent(
            ts=10,
            srcIp="192.168.1.10",
            dstIp="34.117.59.81",
            protocol="TCP",
            port=443,
            bytes=500,
        )
    )

    devices, connections = aggregator.snapshot()

    assert len(devices) == 1
    assert len(connections) == 1
    assert devices[0].bytesOut == 500
    assert connections[0].packetCount == 1
    assert devices[0].trustScore < 100


def test_delta_returns_and_clears_pending_state() -> None:
    aggregator = Aggregator()
    aggregator.ingest(
        TrafficEvent(
            ts=10,
            srcIp="192.168.1.10",
            dstIp="1.1.1.1",
            protocol="UDP",
            port=53,
            bytes=90,
        )
    )

    devices, connections, events = aggregator.delta()
    empty_devices, empty_connections, empty_events = aggregator.delta()

    assert len(devices) == 1
    assert len(connections) == 1
    assert len(events) == 1
    assert empty_devices == []
    assert empty_connections == []
    assert empty_events == []
