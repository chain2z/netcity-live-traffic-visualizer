export type Protocol = "TCP" | "UDP" | "ICMP" | "OTHER";

export interface TrafficEvent {
  ts: number;
  srcIp: string;
  dstIp: string;
  protocol: Protocol;
  port: number | null;
  bytes: number;
}

export interface ScoreBreakdown {
  geoSpread: number;
  destinationReputation: number;
  contactFrequency: number;
  knownTracker: number;
  finalScore: number;
}

export interface Device {
  id: string;
  ip: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  firstSeen: number;
  lastSeen: number;
  bytesIn: number;
  bytesOut: number;
  trustScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface Connection {
  id: string;
  srcDeviceId: string;
  dstIp: string;
  dstHost: string | null;
  protocol: Protocol;
  port: number | null;
  bytes: number;
  packetCount: number;
  lastSeen: number;
}
