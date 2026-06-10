import type { Connection, Device, TrafficEvent } from "../types/domain";
import type { Delta, Snapshot, SourceStatus, StatusUpdate, WSMessage } from "../types/messages";

export function decodeMessage(raw: string): WSMessage {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error("WebSocket message is missing a type.");
  }

  if (parsed.type === "snapshot" && isSnapshot(parsed)) {
    return parsed;
  }
  if (parsed.type === "delta" && isDelta(parsed)) {
    return parsed;
  }
  if (parsed.type === "status" && isStatusUpdate(parsed)) {
    return parsed;
  }

  throw new Error(`Unsupported or malformed WebSocket message: ${parsed.type}`);
}

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isRecord(value) &&
    isSourceStatus(value.sourceStatus) &&
    Array.isArray(value.devices) &&
    value.devices.every(isDevice) &&
    Array.isArray(value.connections) &&
    value.connections.every(isConnection)
  );
}

function isDelta(value: unknown): value is Delta {
  return (
    isRecord(value) &&
    Array.isArray(value.updatedDevices) &&
    value.updatedDevices.every(isDevice) &&
    Array.isArray(value.updatedConnections) &&
    value.updatedConnections.every(isConnection) &&
    Array.isArray(value.newEvents) &&
    value.newEvents.every(isTrafficEvent)
  );
}

function isStatusUpdate(value: unknown): value is StatusUpdate {
  return isRecord(value) && isSourceStatus(value.sourceStatus);
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    isRecord(value) &&
    (value.mode === "LIVE" || value.mode === "MOCK") &&
    (typeof value.failureReason === "string" || value.failureReason === null) &&
    typeof value.message === "string"
  );
}

function isTrafficEvent(value: unknown): value is TrafficEvent {
  return (
    isRecord(value) &&
    typeof value.ts === "number" &&
    typeof value.srcIp === "string" &&
    typeof value.dstIp === "string" &&
    isProtocol(value.protocol) &&
    (typeof value.port === "number" || value.port === null) &&
    typeof value.bytes === "number"
  );
}

function isDevice(value: unknown): value is Device {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.ip === "string" &&
    (typeof value.mac === "string" || value.mac === null) &&
    (typeof value.hostname === "string" || value.hostname === null) &&
    (typeof value.vendor === "string" || value.vendor === null) &&
    typeof value.firstSeen === "number" &&
    typeof value.lastSeen === "number" &&
    typeof value.bytesIn === "number" &&
    typeof value.bytesOut === "number" &&
    typeof value.trustScore === "number" &&
    isScoreBreakdown(value.scoreBreakdown)
  );
}

function isConnection(value: unknown): value is Connection {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.srcDeviceId === "string" &&
    typeof value.dstIp === "string" &&
    (typeof value.dstHost === "string" || value.dstHost === null) &&
    isProtocol(value.protocol) &&
    (typeof value.port === "number" || value.port === null) &&
    typeof value.bytes === "number" &&
    typeof value.packetCount === "number" &&
    typeof value.lastSeen === "number"
  );
}

function isScoreBreakdown(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.geoSpread === "number" &&
    typeof value.destinationReputation === "number" &&
    typeof value.contactFrequency === "number" &&
    typeof value.knownTracker === "number" &&
    typeof value.finalScore === "number"
  );
}

function isProtocol(value: unknown): boolean {
  return value === "TCP" || value === "UDP" || value === "ICMP" || value === "OTHER";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
