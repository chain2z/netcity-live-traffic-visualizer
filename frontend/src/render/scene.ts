import { Application, Assets, Container, Graphics, Sprite, Text } from "pixi.js";

import type { CityStoreSnapshot } from "../store/cityStore";
import type { Device } from "../types/domain";
import { buildingScale, buildingSpriteFor, layoutDevices, trustBadge } from "./buildings";
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
  world.y = Math.max(220, host.clientHeight * 0.34);
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
  let scale = 1;
  let dragging = false;
  let lastPointer: { x: number; y: number } | null = null;

  host.addEventListener("wheel", (event) => {
    event.preventDefault();
    scale = clamp(scale - event.deltaY * 0.001, 0.55, 1.9);
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
    const positions = layoutDevices(devices);
    const segments = roadSegments(connections, positions);

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
        sprites.delete(id);
        labels.delete(id);
        badges.delete(id);
      }
    }

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
          style: { fill: "#d8f3f4", fontSize: 12, align: "center" },
        });
        label.anchor.set(0.5, 0);
        buildingLayer.addChild(label);
        labels.set(device.id, label);

        const badge = new Text({
          text: trustBadge(device),
          style: { fill: "#071014", fontSize: 13, fontWeight: "700" },
        });
        badge.anchor.set(0.5);
        buildingLayer.addChild(badge);
        badges.set(device.id, badge);
      } else {
        sprite.texture = texture;
      }
      updateBuilding(sprite, labels.get(device.id), badges.get(device.id), device, position);
    }
  }

  function updateBuilding(
    sprite: Sprite,
    label: Text | undefined,
    badge: Text | undefined,
    device: Device,
    position: { x: number; y: number },
  ) {
    const size = buildingScale(device);
    sprite.x = position.x;
    sprite.y = position.y;
    sprite.scale.set(size);
    sprite.alpha = device.trustScore < 50 ? 0.9 : 1;
    if (label) {
      label.text = device.ip;
      label.x = position.x;
      label.y = position.y + 8;
    }
    if (badge) {
      badge.text = trustBadge(device);
      badge.x = position.x + 24;
      badge.y = position.y - 80 * size;
    }
  }
}

function drawGrid(graphics: Graphics) {
  graphics.clear();
  for (let row = -8; row <= 8; row += 1) {
    graphics.moveTo(-900, row * 58).lineTo(900, row * 58).stroke({
      width: 1,
      color: 0x31505a,
      alpha: 0.28,
    });
  }
  for (let col = -8; col <= 8; col += 1) {
    graphics.moveTo(col * 112, -520).lineTo(col * 112, 780).stroke({
      width: 1,
      color: 0x31505a,
      alpha: 0.2,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
