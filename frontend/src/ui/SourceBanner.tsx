import { AlertTriangle, RadioTower } from "lucide-react";

import type { SourceStatus } from "../types/messages";

interface SourceBannerProps {
  status: SourceStatus;
  connectionState: "connecting" | "open" | "closed";
}

export function SourceBanner({ status, connectionState }: SourceBannerProps) {
  const live = status.mode === "LIVE";
  return (
    <div
      className={`flex min-h-11 items-center gap-3 border px-4 py-2 text-sm shadow-lg backdrop-blur-md ${
        live
          ? "border-emerald-300/35 bg-emerald-950/80 text-emerald-50"
          : "border-amber-300/45 bg-amber-950/85 text-amber-50"
      }`}
      role="status"
      aria-live="polite"
    >
      {live ? <RadioTower className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
      <div className="min-w-0">
        <div className="font-semibold tracking-normal">
          {live ? "LIVE - capturing host traffic" : "MOCK DATA - live capture unavailable"}
        </div>
        <div className="truncate text-xs opacity-90">
          {status.message}
          {status.failureReason ? ` (${status.failureReason})` : ""} · WebSocket {connectionState}
        </div>
      </div>
    </div>
  );
}
