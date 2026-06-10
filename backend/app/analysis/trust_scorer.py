from __future__ import annotations

from app.analysis.blocklist import matches_blocklist
from app.model.domain import Connection, Device, ScoreBreakdown

# Placeholder weights for the initial scaffold. These are intentionally explicit
# so later tuning can happen without changing the scorer shape.
GEO_SPREAD_WEIGHT = 0
DESTINATION_REPUTATION_WEIGHT = 20
CONTACT_FREQUENCY_WEIGHT = 15
KNOWN_TRACKER_WEIGHT = 35


def score_device(
    device: Device,
    connections: list[Connection],
    blocklist: set[str],
) -> ScoreBreakdown:
    device_connections = [conn for conn in connections if conn.srcDeviceId == device.id]
    tracker_hits = sum(
        1 for conn in device_connections if matches_blocklist(conn.dstHost or conn.dstIp, blocklist)
    )
    total = len(device_connections)
    divisor = max(total, 1)

    geo_spread_penalty = 0.0 * GEO_SPREAD_WEIGHT
    destination_reputation_penalty = (
        min(1.0, tracker_hits / divisor) * DESTINATION_REPUTATION_WEIGHT
    )
    contact_frequency_penalty = min(1.0, total / 20) * CONTACT_FREQUENCY_WEIGHT
    known_tracker_penalty = min(1.0, tracker_hits / 3) * KNOWN_TRACKER_WEIGHT

    final = round(
        100
        - geo_spread_penalty
        - destination_reputation_penalty
        - contact_frequency_penalty
        - known_tracker_penalty
    )
    return ScoreBreakdown(
        geoSpread=geo_spread_penalty,
        destinationReputation=destination_reputation_penalty,
        contactFrequency=contact_frequency_penalty,
        knownTracker=known_tracker_penalty,
        finalScore=max(0, min(100, final)),
    )
