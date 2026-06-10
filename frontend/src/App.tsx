import { useEffect, useMemo, useRef } from "react";

import { CitySocket } from "./net/client";
import { mountCityScene, type CityScene } from "./render/scene";
import { useCityStore, type CityStoreSnapshot } from "./store/cityStore";
import { DetailPanel } from "./ui/DetailPanel";
import { Hud } from "./ui/Hud";
import { Legend } from "./ui/Legend";
import { SourceBanner } from "./ui/SourceBanner";

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const devicesById = useCityStore((state) => state.devices);
  const connectionsById = useCityStore((state) => state.connections);
  const sourceStatus = useCityStore((state) => state.sourceStatus);
  const selectedDeviceId = useCityStore((state) => state.selectedDeviceId);
  const connectionState = useCityStore((state) => state.connectionState);
  const applyMessage = useCityStore((state) => state.applyMessage);
  const selectDevice = useCityStore((state) => state.selectDevice);
  const setConnectionState = useCityStore((state) => state.setConnectionState);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const connections = useMemo(() => Object.values(connectionsById), [connectionsById]);
  const selectedDevice = selectedDeviceId ? devicesById[selectedDeviceId] ?? null : null;

  useEffect(() => {
    const socket = new CitySocket({
      onMessage: applyMessage,
      onConnectionState: setConnectionState,
    });
    socket.connect();
    return () => socket.close();
  }, [applyMessage, setConnectionState]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectDevice(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectDevice]);

  useEffect(() => {
    if (!hostRef.current || sceneRef.current) return;
    let cancelled = false;
    mountCityScene(hostRef.current, snapshotFromState(useCityStore.getState()), selectDevice).then(
      (scene) => {
        if (cancelled) {
          scene.destroy();
          return;
        }
        sceneRef.current = scene;
      },
    );

    const unsubscribe = useCityStore.subscribe((state) => {
      sceneRef.current?.sync(snapshotFromState(state));
    });
    return () => {
      cancelled = true;
      unsubscribe();
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [selectDevice]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#071014] text-white">
      <div ref={hostRef} className="absolute inset-0" aria-label="Isometric traffic city" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.48))]" />

      <div className="absolute left-3 right-3 top-3 z-10">
        <SourceBanner status={sourceStatus} connectionState={connectionState} />
      </div>

      <div className="absolute left-3 top-24 z-10 w-[min(26rem,calc(100vw-1.5rem))]">
        <Hud devices={devices} connections={connections} />
      </div>

      <div className="absolute bottom-3 left-3 z-10 w-[min(22rem,calc(100vw-1.5rem))]">
        <Legend />
      </div>

      <div className="absolute bottom-0 right-0 top-0 z-20 flex w-[min(26rem,100vw)] justify-end">
        <DetailPanel
          device={selectedDevice}
          connections={connections}
          onClose={() => selectDevice(null)}
        />
      </div>
    </main>
  );
}

function snapshotFromState(state: ReturnType<typeof useCityStore.getState>): CityStoreSnapshot {
  return {
    devices: state.devices,
    connections: state.connections,
    recentEvents: state.recentEvents,
    sourceStatus: state.sourceStatus,
    selectedDeviceId: state.selectedDeviceId,
    connectionState: state.connectionState,
  };
}
