import lowSprite from "../assets/sprites/building-low.svg";
import midSprite from "../assets/sprites/building-mid.svg";
import highSprite from "../assets/sprites/building-high.svg";
import type { Device } from "../types/domain";

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
  return Math.min(1.35, 0.62 + Math.log10(total + 10) / 5);
}

export function trustBadge(device: Device): string {
  if (device.trustScore >= 80) return "A";
  if (device.trustScore >= 60) return "B";
  if (device.trustScore >= 40) return "C";
  return "D";
}

export function layoutDevices(devices: Device[]): Map<string, IsoPoint> {
  const positions = new Map<string, IsoPoint>();
  const sorted = [...devices].sort((a, b) => a.id.localeCompare(b.id));
  const cols = Math.max(2, Math.ceil(Math.sqrt(sorted.length || 1)));
  sorted.forEach((device, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isoX = (col - row) * 112;
    const isoY = (col + row) * 58;
    positions.set(device.id, { x: isoX, y: isoY });
  });
  return positions;
}
