import { CHENNAI_BOUNDS } from "./constants";

export type LatLng = { lat: number; lng: number };

/** Where "near me" is measured from, and how we got it. */
export type Origin = LatLng & { source: "gps" | "pin" };

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km. Plenty accurate at city scale. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** "450 m" / "1.2 km" / "12 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function isInChennai({ lat, lng }: LatLng): boolean {
  const [[south, west], [north, east]] = CHENNAI_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export const RADIUS_OPTIONS_KM = [1, 2, 5, 10] as const;
export const DEFAULT_RADIUS_KM = 5;

export const ORIGIN_STORAGE_KEY = "chennailocal:origin";

/** Remember the last location so a phone user isn't re-prompted every visit. */
export function loadSavedOrigin(): Origin | null {
  try {
    const raw = localStorage.getItem(ORIGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Origin;
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number") {
      return null;
    }
    return isInChennai(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOrigin(origin: Origin | null): void {
  try {
    if (origin) localStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(origin));
    else localStorage.removeItem(ORIGIN_STORAGE_KEY);
  } catch {
    // Private mode / blocked storage — the feature still works for this session.
  }
}
