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
): RoadSegment[] {
  return connections.flatMap((connection, index) => {
    const from = positions.get(connection.srcDeviceId);
    if (!from) return [];
    return [
      {
        id: connection.id,
        from,
        to: destinationPoint(from, connection.dstIp, index),
        bytes: connection.bytes,
      },
    ];
  });
}

function destinationPoint(from: IsoPoint, dstIp: string, index: number): IsoPoint {
  const hash = [...dstIp].reduce((total, char) => total + char.charCodeAt(0), 0);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 120 + (index % 4) * 34;
  return {
    x: from.x + Math.cos(angle) * radius,
    y: from.y + Math.sin(angle) * radius * 0.54 + 26,
  };
}
