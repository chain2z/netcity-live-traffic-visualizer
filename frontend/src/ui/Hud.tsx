import { Activity, Server, Wifi } from "lucide-react";
import type React from "react";

import type { Connection, Device } from "../types/domain";

interface HudProps {
  devices: Device[];
  connections: Connection[];
}

export function Hud({ devices, connections }: HudProps) {
  const totalBytes = devices.reduce((sum, device) => sum + device.bytesIn + device.bytesOut, 0);
  const networkDevices = devices.filter((device) => isPrivateIp(device.ip));
  const visibleLinks = countVisibleLinks(connections, devices);
  const averageTrust =
    networkDevices.length === 0
      ? 100
      : Math.round(
          networkDevices.reduce((sum, device) => sum + device.trustScore, 0) /
            networkDevices.length,
        );

  return (
    <section className="border border-line bg-panel p-3 text-sm shadow-xl backdrop-blur-md" aria-label="Traffic summary">
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={<Server />} label="Devices" value={networkDevices.length.toString()} />
        <Metric icon={<Wifi />} label="Links" value={visibleLinks.toString()} />
        <Metric icon={<Activity />} label="Trust" value={`${averageTrust}`} />
      </div>
      <div className="mt-3 border-t border-line pt-2 text-xs text-slate-300">
        {formatBytes(totalBytes)} observed this session
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-slate-300">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function countVisibleLinks(connections: Connection[], devices: Device[]): number {
  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const deviceIdByIp = new Map(devices.map((device) => [device.ip, device.id]));
  const links = new Set<string>();

  for (const connection of connections) {
    const source = devicesById.get(connection.srcDeviceId);
    const destinationId = deviceIdByIp.get(connection.dstIp);

    if (source && isPrivateIp(source.ip)) {
      links.add(`${connection.srcDeviceId}|${connection.dstIp}`);
    } else if (source && destinationId) {
      links.add(`${destinationId}|${source.ip}`);
    }
  }

  return links.size;
}
