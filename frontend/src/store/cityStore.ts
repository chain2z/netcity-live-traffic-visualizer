import { create } from "zustand";

import type { Connection, Device, TrafficEvent } from "../types/domain";
import type { SourceStatus, WSMessage } from "../types/messages";

interface CityState {
  devices: Record<string, Device>;
  connections: Record<string, Connection>;
  recentEvents: TrafficEvent[];
  sourceStatus: SourceStatus;
  selectedDeviceId: string | null;
  connectionState: "connecting" | "open" | "closed";
  applyMessage: (message: WSMessage) => void;
  selectDevice: (id: string | null) => void;
  setConnectionState: (state: CityState["connectionState"]) => void;
}

const defaultStatus: SourceStatus = {
  mode: "MOCK",
  failureReason: null,
  message: "Waiting for data source.",
};

export const useCityStore = create<CityState>((set) => ({
  devices: {},
  connections: {},
  recentEvents: [],
  sourceStatus: defaultStatus,
  selectedDeviceId: null,
  connectionState: "connecting",
  applyMessage: (message) =>
    set((state) => {
      if (message.type === "snapshot") {
        return {
          devices: byId(message.devices),
          connections: byId(message.connections),
          recentEvents: [],
          sourceStatus: message.sourceStatus,
        };
      }
      if (message.type === "status") {
        return { sourceStatus: message.sourceStatus };
      }
      return {
        devices: { ...state.devices, ...byId(message.updatedDevices) },
        connections: { ...state.connections, ...byId(message.updatedConnections) },
        recentEvents: [...message.newEvents, ...state.recentEvents].slice(0, 80),
      };
    }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setConnectionState: (connectionState) => set({ connectionState }),
}));

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export type CityStoreSnapshot = Omit<CityState, "applyMessage" | "selectDevice" | "setConnectionState">;
