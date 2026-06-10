export interface GeoPoint {
  lat: number;
  lon: number;
  label: string | null;
}

export interface GeoResolver {
  resolve(ipOrHost: string): Promise<GeoPoint | null>;
}

export class NullGeoResolver implements GeoResolver {
  async resolve(): Promise<GeoPoint | null> {
    return null;
  }
}
