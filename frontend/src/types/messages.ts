import type { Connection, Device, TrafficEvent } from "./domain";

export type FailureReason =
  | "INSUFFICIENT_PRIVILEGES"
  | "NO_CAPTURE_INTERFACE"
  | "UNSUPPORTED_PLATFORM"
  | "CAPTURE_INIT_ERROR";

export interface SourceStatus {
  mode: "LIVE" | "MOCK";
  failureReason: FailureReason | null;
  message: string;
}

export interface Snapshot {
  type: "snapshot";
  sourceStatus: SourceStatus;
  devices: Device[];
  connections: Connection[];
}

export interface Delta {
  type: "delta";
  updatedDevices: Device[];
  updatedConnections: Connection[];
  newEvents: TrafficEvent[];
}

export interface StatusUpdate {
  type: "status";
  sourceStatus: SourceStatus;
}

export type WSMessage = Snapshot | Delta | StatusUpdate;
