import type { RouteCoordinate } from "@/types/activity";
import { isValidCoordinate } from "./geo-tracking";

const MAX_ROUTE_POINTS = 500;
const MAX_ROUTE_PAYLOAD_BYTES = 50 * 1024; // 50 KB

export interface RouteValidationResult {
  valid: boolean;
  error?: string;
  sanitizedData?: RouteCoordinate[] | null;
}

/**
 * Server-side route data validation.
 * Enforces:
 * - Structural schema integrity
 * - Valid geographic bounding (-90 <= lat <= 90, -180 <= lng <= 180)
 * - Maximum point count limit (<= 500 points)
 * - Maximum serialized payload byte limit (<= 50 KB)
 * - Numeric integrity (no NaNs, Infinities, or malicious fields)
 */
export function validateRouteData(raw: unknown): RouteValidationResult {
  if (raw === null || raw === undefined) {
    return { valid: true, sanitizedData: null };
  }

  if (!Array.isArray(raw)) {
    return { valid: false, error: "Route data must be an array of coordinate points." };
  }

  if (raw.length === 0) {
    return { valid: true, sanitizedData: [] };
  }

  if (raw.length > MAX_ROUTE_POINTS) {
    return {
      valid: false,
      error: `Route data exceeds maximum limit of ${MAX_ROUTE_POINTS} coordinates (received ${raw.length}).`,
    };
  }

  const jsonString = JSON.stringify(raw);
  if (Buffer.byteLength(jsonString, "utf8") > MAX_ROUTE_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Route data size exceeds maximum allowable payload of ${MAX_ROUTE_PAYLOAD_BYTES / 1024} KB.`,
    };
  }

  const sanitized: RouteCoordinate[] = [];

  for (let i = 0; i < raw.length; i++) {
    const pt = raw[i];
    if (typeof pt !== "object" || pt === null) {
      return { valid: false, error: `Invalid coordinate object at index ${i}.` };
    }

    const lat = Number(pt.lat);
    const lng = Number(pt.lng);
    const offset = Number(pt.timestamp_offset_sec);

    if (!isValidCoordinate(lat, lng)) {
      return { valid: false, error: `Coordinate at index ${i} has invalid latitude or longitude.` };
    }

    if (isNaN(offset) || offset < 0) {
      return { valid: false, error: `Coordinate at index ${i} has invalid timestamp offset.` };
    }

    const accuracy = pt.accuracy_m !== undefined ? Number(pt.accuracy_m) : undefined;
    if (accuracy !== undefined && (isNaN(accuracy) || accuracy < 0)) {
      return { valid: false, error: `Coordinate at index ${i} has invalid accuracy value.` };
    }

    sanitized.push({
      lat: Math.round(lat * 1e6) / 1e6, // Round to 6 decimal places (~0.1m)
      lng: Math.round(lng * 1e6) / 1e6,
      timestamp_offset_sec: Math.round(offset * 10) / 10,
      ...(accuracy !== undefined ? { accuracy_m: Math.round(accuracy * 10) / 10 } : {}),
    });
  }

  return { valid: true, sanitizedData: sanitized };
}
