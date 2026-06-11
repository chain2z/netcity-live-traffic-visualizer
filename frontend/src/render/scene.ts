import { Application, Assets, Container, Graphics, Sprite, Text } from "pixi.js";

import type { CityStoreSnapshot } from "../store/cityStore";
import type { Device } from "../types/domain";
import {
  buildingScale,
  buildingSpriteFor,
  inferHostDeviceId,
  layoutDevices,
  trustBadge,
} from "./buildings";
import { PacketCarSystem } from "./cars";
import { roadSegments } from "./roads";

export interface CityScene {
  sync(snapshot: CityStoreSnapshot): void;
  destroy(): void;
}

export async function mountCityScene(
  host: HTMLElement,
  initial: CityStoreSnapshot,
  onSelectDevice: (id: string) => void,
): Promise<CityScene> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundColor: 0x071014,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const world = new Container();
  world.x = host.clientWidth / 2;
  world.y = host.clientHeight / 2 + 80;
  world.scale.set(0.34);
  app.stage.addChild(world);

  const gridLayer = new Graphics();
  const roadLayer = new Graphics();
  const destinationLayer = new Graphics();
  const buildingLayer = new Container();
  const carLayer = new Container();
  world.addChild(gridLayer, roadLayer, destinationLayer, buildingLayer, carLayer);
  drawGrid(gridLayer);

  const cars = new PacketCarSystem(carLayer);
  const sprites = new Map<string, Sprite>();
  const labels = new Map<string, Text>();
  const badges = new Map<string, Text>();
  const hostRings = new Map<string, Graphics>();
  let scale = 0.34;
  let dragging = false;
  let lastPointer: { x: number; y: number } | null = null;

  host.addEventListener("wheel", (event) => {
    event.preventDefault();
    scale = clamp(scale - event.deltaY * 0.001, 0.2, 1.25);
    world.scale.set(scale);
  });
  host.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  host.addEventListener("pointermove", (event) => {
    if (!dragging || !lastPointer) return;
    world.x += event.clientX - lastPointer.x;
    world.y += event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
    lastPointer = null;
  });

  const scene: CityScene = {
    sync(snapshot) {
      renderSnapshot(snapshot);
    },
    destroy() {
      app.destroy(true, { children: true, texture: false });
    },
  };

  app.ticker.add((ticker) => cars.update(ticker.deltaMS));
  await renderSnapshot(initial);
  return scene;

  async function renderSnapshot(snapshot: CityStoreSnapshot) {
    const devices = Object.values(snapshot.devices);
    const connections = Object.values(snapshot.connections);
    const positions = layoutDevices(devices, connections);
    const deviceIdByIp = new Map(devices.map((device) => [device.ip, device.id]));
    const segments = roadSegments(connections, positions, deviceIdByIp);

    roadLayer.clear();
    destinationLayer.clear();
    for (const segment of segments) {
      roadLayer
        .moveTo(segment.from.x, segment.from.y)
        .lineTo(segment.to.x, segment.to.y)
        .stroke({ width: 2, color: 0x8bd3dd, alpha: 0.35 });
      destinationLayer.circle(segment.to.x, segment.to.y, 5).fill({ color: 0xd8b4fe, alpha: 0.8 });
    }
    cars.sync(segments);

    const wanted = new Set(devices.map((device) => device.id));
    for (const [id, sprite] of sprites) {
      if (!wanted.has(id)) {
        sprite.destroy();
        labels.get(id)?.destroy();
        badges.get(id)?.destroy();
        hostRings.get(id)?.destroy();
        sprites.delete(id);
        labels.delete(id);
        badges.delete(id);
        hostRings.delete(id);
      }
    }

    const hostDeviceId = inferHostDeviceId(devices, connections);
    for (const device of devices) {
      const position = positions.get(device.id);
      if (!position) continue;
      const spriteUrl = buildingSpriteFor(device);
      const texture = await Assets.load(spriteUrl);
      let sprite = sprites.get(device.id);
      if (!sprite) {
        sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";
        sprite.on("pointertap", () => onSelectDevice(device.id));
        buildingLayer.addChild(sprite);
        sprites.set(device.id, sprite);

        const label = new Text({
          text: device.ip,
          style: { fill: "#d8f3f4", fontSize: 10, align: "center" },
        });
        label.anchor.set(0.5, 0);
        buildingLayer.addChild(label);
        labels.set(device.id, label);

        const badge = new Text({
          text: trustBadge(device),
          style: { fill: "#071014", fontSize: 11, fontWeight: "700" },
        });
        badge.anchor.set(0.5);
        buildingLayer.addChild(badge);
        badges.set(device.id, badge);

        const hostRing = new Graphics();
        buildingLayer.addChild(hostRing);
        hostRings.set(device.id, hostRing);
      } else {
        sprite.texture = texture;
      }
      updateBuilding(
        sprite,
        labels.get(device.id),
        badges.get(device.id),
        hostRings.get(device.id),
        device,
        position,
        device.id === hostDeviceId,
      );
    }
  }

  function updateBuilding(
    sprite: Sprite,
    label: Text | undefined,
    badge: Text | undefined,
    hostRing: Graphics | undefined,
    device: Device,
    position: { x: number; y: number },
    isHost: boolean,
  ) {
    const size = buildingScale(device) * (isHost ? 1.18 : 1);
    sprite.x = position.x;
    sprite.y = position.y;
    sprite.scale.set(size);
    sprite.alpha = device.trustScore < 50 ? 0.9 : 1;
    if (label) {
      label.text = device.ip;
      label.x = position.x;
      label.y = position.y + 10;
      label.alpha = 0.82;
    }
    if (badge) {
      badge.text = trustBadge(device);
      badge.x = position.x + 16;
      badge.y = position.y - 58 * size;
    }
    if (hostRing) {
      hostRing.clear();
      hostRing.visible = isHost;
      if (isHost) {
        hostRing
          .circle(position.x, position.y - 42 * size, 64 * size)
          .stroke({ width: 3, color: 0x5eead4, alpha: 0.85 });
      }
    }
  }
}

function drawGrid(graphics: Graphics) {
  graphics.clear();
  for (let row = -14; row <= 24; row += 1) {
    graphics.moveTo(-2200, row * 92).lineTo(3200, row * 92).stroke({
      width: 1,
      color: 0x31505a,
      alpha: 0.28,
    });
  }
  for (let col = -18; col <= 24; col += 1) {
    graphics.moveTo(col * 178, -720).lineTo(col * 178, 2200).stroke({
      width: 1,
      color: 0x31505a,
      alpha: 0.2,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
