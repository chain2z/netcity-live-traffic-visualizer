import { Container, Graphics } from "pixi.js";

import type { RoadSegment } from "./roads";

interface PacketCar {
  id: string;
  segment: RoadSegment;
  progress: number;
  speed: number;
  graphic: Graphics;
}

export class PacketCarSystem {
  private cars = new Map<string, PacketCar>();

  constructor(private readonly layer: Container) {}

  sync(segments: RoadSegment[]) {
    const wanted = new Set<string>();
    for (const segment of segments) {
      const count = Math.max(1, Math.min(4, Math.ceil(segment.bytes / 900)));
      for (let index = 0; index < count; index += 1) {
        const id = `${segment.id}-${index}`;
        wanted.add(id);
        if (!this.cars.has(id)) {
          const graphic = new Graphics();
          graphic.circle(0, 0, 4).fill({ color: 0xf8d66d, alpha: 0.95 });
          this.layer.addChild(graphic);
          this.cars.set(id, {
            id,
            segment,
            progress: index / count,
            speed: 0.00012 + Math.min(segment.bytes, 5000) / 18_000_000,
            graphic,
          });
        } else {
          const car = this.cars.get(id)!;
          car.segment = segment;
          car.speed = 0.00012 + Math.min(segment.bytes, 5000) / 18_000_000;
        }
      }
    }

    for (const [id, car] of this.cars) {
      if (!wanted.has(id)) {
        car.graphic.destroy();
        this.cars.delete(id);
      }
    }
  }

  update(deltaMs: number) {
    for (const car of this.cars.values()) {
      car.progress = (car.progress + car.speed * deltaMs) % 1;
      car.graphic.x = lerp(car.segment.from.x, car.segment.to.x, car.progress);
      car.graphic.y = lerp(car.segment.from.y, car.segment.to.y, car.progress);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
