import { beforeEach, describe, expect, it } from "vitest";

import { useCityStore } from "./cityStore";
import type { Device } from "../types/domain";

const device: Device = {
  id: "dev1",
  ip: "192.168.1.10",
  mac: null,
  hostname: null,
  vendor: null,
  firstSeen: 1,
  lastSeen: 2,
  bytesIn: 0,
  bytesOut: 500,
  trustScore: 91,
  scoreBreakdown: {
    geoSpread: 0,
    destinationReputation: 0,
    contactFrequency: 1,
    knownTracker: 0,
    finalScore: 91,
  },
};

describe("cityStore", () => {
  beforeEach(() => {
    useCityStore.setState({
      devices: {},
      connections: {},
      recentEvents: [],
      sourceStatus: { mode: "MOCK", failureReason: null, message: "Waiting for data source." },
      selectedDeviceId: null,
      connectionState: "connecting",
    });
  });

  it("applies snapshots", () => {
    useCityStore.getState().applyMessage({
      type: "snapshot",
      sourceStatus: { mode: "MOCK", failureReason: "INSUFFICIENT_PRIVILEGES", message: "No admin." },
      devices: [device],
      connections: [],
    });

    expect(useCityStore.getState().devices.dev1.ip).toBe("192.168.1.10");
    expect(useCityStore.getState().sourceStatus.failureReason).toBe("INSUFFICIENT_PRIVILEGES");
  });

  it("merges deltas", () => {
    useCityStore.getState().applyMessage({
      type: "delta",
      updatedDevices: [device],
      updatedConnections: [],
      newEvents: [
        {
          ts: 1,
          srcIp: "192.168.1.10",
          dstIp: "1.1.1.1",
          protocol: "UDP",
          port: 53,
          bytes: 90,
        },
      ],
    });

    expect(Object.keys(useCityStore.getState().devices)).toEqual(["dev1"]);
    expect(useCityStore.getState().recentEvents).toHaveLength(1);
  });
});
