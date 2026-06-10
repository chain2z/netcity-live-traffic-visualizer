import { X } from "lucide-react";

import type { Connection, Device, ScoreBreakdown } from "../types/domain";

interface DetailPanelProps {
  device: Device | null;
  connections: Connection[];
  onClose: () => void;
}

export function DetailPanel({ device, connections, onClose }: DetailPanelProps) {
  if (!device) return null;

  const related = connections
    .filter((connection) => connection.srcDeviceId === device.id)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  return (
    <aside
      className="w-full max-w-sm border-l border-line bg-panel p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-md"
      aria-label="Selected device details"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">{device.hostname ?? device.ip}</h2>
          <div className="text-xs text-slate-300">{device.ip}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-line p-2 text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-300"
          aria-label="Close details"
          title="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-y border-line py-3">
        <Detail label="MAC" value={device.mac ?? "Unknown"} />
        <Detail label="Vendor" value={device.vendor ?? "Unknown"} />
        <Detail label="Bytes in" value={formatBytes(device.bytesIn)} />
        <Detail label="Bytes out" value={formatBytes(device.bytesOut)} />
      </dl>

      <section className="mt-4">
        <h3 className="mb-2 font-semibold text-white">Trust score {device.trustScore}</h3>
        <ScoreBars breakdown={device.scoreBreakdown} />
      </section>

      <section className="mt-4">
        <h3 className="mb-2 font-semibold text-white">Top destinations</h3>
        <div className="grid gap-2">
          {related.length === 0 ? (
            <div className="text-slate-300">No destinations yet.</div>
          ) : (
            related.map((connection) => (
              <div key={connection.id} className="border border-line p-2">
                <div className="truncate text-white">{connection.dstHost ?? connection.dstIp}</div>
                <div className="text-xs text-slate-300">
                  {connection.protocol} {connection.port ?? "n/a"} · {formatBytes(connection.bytes)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="truncate text-slate-100">{value}</dd>
    </div>
  );
}

function ScoreBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows: Array<[string, number]> = [
    ["Geo spread", breakdown.geoSpread],
    ["Destination reputation", breakdown.destinationReputation],
    ["Contact frequency", breakdown.contactFrequency],
    ["Known tracker", breakdown.knownTracker],
  ];
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{label}</span>
            <span>{value.toFixed(1)}</span>
          </div>
          <div className="h-2 bg-slate-800">
            <div className="h-full bg-amber-300" style={{ width: `${Math.min(100, value)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
