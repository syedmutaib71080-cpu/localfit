import type { ActivityType, RouteCoordinate } from "@/types/activity";

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Great-Circle distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Validates coordinate ranges.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export interface GpsFilterResult {
  accepted: boolean;
  distanceMeters: number;
  reason?: "ACCURACY_TOO_LOW" | "IMPOSSIBLE_SPEED_JUMP" | "STATIONARY_JITTER" | "INVALID_COORDINATES";
}

/**
 * Filters incoming GPS coordinates:
 * - Rejects points with horizontal accuracy > 30 meters
 * - Rejects impossible velocity spikes (teleportation / multipath anomalies)
 * - Filters stationary micro-jitter (< 2.5 meters)
 */
export function filterGpsCoordinate(
  newCoord: { lat: number; lng: number; timestampMs: number; accuracyM?: number },
  previousCoord: { lat: number; lng: number; timestampMs: number } | null,
  activityType: ActivityType
): GpsFilterResult {
  if (!isValidCoordinate(newCoord.lat, newCoord.lng)) {
    return { accepted: false, distanceMeters: 0, reason: "INVALID_COORDINATES" };
  }

  // Gate 1: Accuracy threshold (reject if accuracy is worse than 30m)
  if (newCoord.accuracyM !== undefined && newCoord.accuracyM > 30) {
    return { accepted: false, distanceMeters: 0, reason: "ACCURACY_TOO_LOW" };
  }

  // If this is the initial point, accept it
  if (!previousCoord) {
    return { accepted: true, distanceMeters: 0 };
  }

  const segmentDistanceMeters = calculateHaversineDistance(
    previousCoord.lat,
    previousCoord.lng,
    newCoord.lat,
    newCoord.lng
  );

  // Gate 2: Ignore stationary micro-jitter (< 2.5 meters)
  if (segmentDistanceMeters < 2.5) {
    return { accepted: false, distanceMeters: 0, reason: "STATIONARY_JITTER" };
  }

  // Gate 3: Impossible velocity jump check
  const deltaSeconds = Math.max(0.5, (newCoord.timestampMs - previousCoord.timestampMs) / 1000);
  const impliedSpeedKmh = (segmentDistanceMeters / 1000) / (deltaSeconds / 3600);

  // Maximum human speed limits
  const maxAllowedSpeedKmh = activityType === "cycling" ? 75 : 40;

  if (impliedSpeedKmh > maxAllowedSpeedKmh) {
    return { accepted: false, distanceMeters: 0, reason: "IMPOSSIBLE_SPEED_JUMP" };
  }

  return { accepted: true, distanceMeters: segmentDistanceMeters };
}

/**
 * Downsamples route coordinates to prevent excessive database payload sizes.
 * Ensures maximum of `maxPoints` (default 500) while strictly preserving start and finish points.
 */
export function downsampleRoutePoints(
  points: RouteCoordinate[],
  maxPoints: number = 500
): RouteCoordinate[] {
  if (points.length <= maxPoints) return points;

  const result: RouteCoordinate[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  result.push(points[points.length - 1]);
  return result;
}
