import type { Connection } from "../types/domain";
import type { IsoPoint } from "./buildings";

export interface RoadSegment {
  id: string;
  from: IsoPoint;
  to: IsoPoint;
  bytes: number;
}

export function roadSegments(
  connections: Connection[],
  positions: Map<string, IsoPoint>,
  deviceIdByIp: Map<string, string> = new Map(),
): RoadSegment[] {
  const grouped = new Map<string, Connection>();
  for (const connection of connections) {
    const key = `${connection.srcDeviceId}|${connection.dstIp}`;
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, {
        ...existing,
        id: key,
        bytes: existing.bytes + connection.bytes,
        packetCount: existing.packetCount + connection.packetCount,
        lastSeen: Math.max(existing.lastSeen, connection.lastSeen),
      });
    } else {
      grouped.set(key, { ...connection, id: key });
    }
  }

  return [...grouped.values()].flatMap((connection, index) => {
    const from = positions.get(connection.srcDeviceId);
    if (!from) return [];
    const dstDeviceId = deviceIdByIp.get(connection.dstIp);
    const connectedDestination = dstDeviceId ? positions.get(dstDeviceId) : undefined;
    return [
      {
        id: connection.id,
        from,
        to: connectedDestination ?? destinationPoint(from, connection.dstIp, index),
        bytes: connection.bytes,
      },
    ];
  });
}

function destinationPoint(from: IsoPoint, dstIp: string, index: number): IsoPoint {
  const hash = [...dstIp].reduce((total, char) => total + char.charCodeAt(0), 0);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 260 + (index % 6) * 54;
  return {
    x: from.x + Math.cos(angle) * radius,
    y: from.y + Math.sin(angle) * radius * 0.54 + 26,
  };
}
