import lowSprite from "../assets/sprites/building-low.svg";
import midSprite from "../assets/sprites/building-mid.svg";
import highSprite from "../assets/sprites/building-high.svg";
import type { Connection, Device } from "../types/domain";

export interface IsoPoint {
  x: number;
  y: number;
}

export function buildingSpriteFor(device: Device): string {
  const total = device.bytesIn + device.bytesOut;
  if (total > 2500) return highSprite;
  if (total > 900) return midSprite;
  return lowSprite;
}

export function buildingScale(device: Device): number {
  const total = device.bytesIn + device.bytesOut;
  return Math.min(0.82, 0.36 + Math.log10(total + 10) / 8);
}

export function inferHostDeviceId(devices: Device[], connections: Connection[] = []): string | null {
  return inferHostDevice(devices, connections)?.id ?? null;
}

export function trustBadge(device: Device): string {
  if (device.trustScore >= 80) return "A";
  if (device.trustScore >= 60) return "B";
  if (device.trustScore >= 40) return "C";
  return "D";
}

export function layoutDevices(devices: Device[], connections: Connection[] = []): Map<string, IsoPoint> {
  const positions = new Map<string, IsoPoint>();
  if (devices.length === 0) return positions;

  const host = inferHostDevice(devices, connections);
  const hostId = host?.id;
  if (hostId) {
    positions.set(hostId, { x: 0, y: 0 });
  }

  const sorted = [...devices]
    .filter((device) => device.id !== hostId)
    .sort((a, b) => {
      const privateOrder = Number(isPrivateIp(b.ip)) - Number(isPrivateIp(a.ip));
      if (privateOrder !== 0) return privateOrder;
      return (b.bytesIn + b.bytesOut) - (a.bytesIn + a.bytesOut);
    });

  sorted.forEach((device, index) => {
    const { ring, indexInRing, ringCount } = ringSlot(index);
    const angle = (indexInRing / ringCount) * Math.PI * 2 + ring * 0.31;
    const radius = 330 + ring * 235;
    const isoX = Math.cos(angle) * radius;
    const isoY = Math.sin(angle) * radius * 0.58;
    positions.set(device.id, { x: isoX, y: isoY });
  });
  return positions;
}

function ringSlot(index: number): { ring: number; indexInRing: number; ringCount: number } {
  let ring = 1;
  let ringCount = 10;
  let remaining = index;
  while (remaining >= ringCount) {
    remaining -= ringCount;
    ring += 1;
    ringCount += 8;
  }
  return { ring, indexInRing: remaining, ringCount };
}

function inferHostDevice(devices: Device[], connections: Connection[]): Device | undefined {
  const outgoingByDevice = new Map<string, number>();
  for (const connection of connections) {
    outgoingByDevice.set(
      connection.srcDeviceId,
      (outgoingByDevice.get(connection.srcDeviceId) ?? 0) + connection.bytes,
    );
  }

  const localDevices = devices.filter((device) => isPrivateIp(device.ip));
  const candidates = localDevices.length > 0 ? localDevices : devices;
  return [...candidates].sort((a, b) => {
    const aScore = (outgoingByDevice.get(a.id) ?? 0) + a.bytesOut * 2 + a.bytesIn;
    const bScore = (outgoingByDevice.get(b.id) ?? 0) + b.bytesOut * 2 + b.bytesIn;
    return bScore - aScore;
  })[0];
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
