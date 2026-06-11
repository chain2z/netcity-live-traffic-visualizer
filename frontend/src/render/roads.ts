import type { Connection, Device } from "../types/domain";
import { isPrivateIp, type IsoPoint } from "./buildings";

export interface RoadSegment {
  id: string;
  from: IsoPoint;
  to: IsoPoint;
  bytes: number;
  endpoint: "device" | "external";
}

export function roadSegments(
  connections: Connection[],
  positions: Map<string, IsoPoint>,
  devicesById: Map<string, Device>,
  deviceIdByIp: Map<string, string>,
): RoadSegment[] {
  const grouped = new Map<
    string,
    {
      id: string;
      from: IsoPoint;
      to: IsoPoint;
      bytes: number;
      endpoint: "device" | "external";
    }
  >();

  for (const connection of connections) {
    const visual = visualConnection(connection, positions, devicesById, deviceIdByIp);
    if (!visual) continue;
    const key = `${Math.round(visual.from.x)}:${Math.round(visual.from.y)}|${Math.round(
      visual.to.x,
    )}:${Math.round(visual.to.y)}|${visual.endpoint}`;
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, {
        ...existing,
        bytes: existing.bytes + connection.bytes,
      });
    } else {
      grouped.set(key, {
        id: key,
        from: visual.from,
        to: visual.to,
        bytes: connection.bytes,
        endpoint: visual.endpoint,
      });
    }
  }

  return [...grouped.values()];
}

function visualConnection(
  connection: Connection,
  positions: Map<string, IsoPoint>,
  devicesById: Map<string, Device>,
  deviceIdByIp: Map<string, string>,
): { from: IsoPoint; to: IsoPoint; endpoint: "device" | "external" } | null {
  const srcDevice = devicesById.get(connection.srcDeviceId);
  const srcPosition = positions.get(connection.srcDeviceId);
  const dstDeviceId = deviceIdByIp.get(connection.dstIp);
  const dstPosition = dstDeviceId ? positions.get(dstDeviceId) : undefined;

  if (srcPosition && dstPosition) {
    return { from: srcPosition, to: dstPosition, endpoint: "device" };
  }
  if (srcPosition) {
    return {
      from: srcPosition,
      to: destinationPoint(connection.dstIp),
      endpoint: "external",
    };
  }
  if (srcDevice && !isPrivateIp(srcDevice.ip) && dstPosition) {
    return {
      from: dstPosition,
      to: destinationPoint(srcDevice.ip),
      endpoint: "external",
    };
  }
  return null;
}

function destinationPoint(ip: string): IsoPoint {
  const hash = hashIp(ip);
  const angle = ((hash % 360) * Math.PI) / 180;
  const ring = 1 + (hash % 4);
  const radius = 780 + ring * 170;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.58,
  };
}

function hashIp(ip: string): number {
  return [...ip].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
}
