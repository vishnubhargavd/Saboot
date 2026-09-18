import * as Location from 'expo-location';
import { RawGPSPoint } from '../types/evidence';

/**
 * Computes great-circle distance using Haversine formula (meters)
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

/**
 * Checks and requests foreground location permissions
 */
export async function requestForegroundLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.granted) {
      return {
        granted: true,
        canAskAgain: existing.canAskAgain,
        status: existing.status,
      };
    }

    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
      status,
    };
  } catch {
    return {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.DENIED,
    };
  }
}

/**
 * Fetches single current location snapshot with graceful fallback
 */
export async function getCurrentRawLocation(): Promise<RawGPSPoint | null> {
  try {
    const isServicesEnabled = await Location.isLocationServicesEnabledAsync().catch(() => false);
    if (!isServicesEnabled) {
      return null;
    }

    const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!perm?.granted) {
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      altitude: loc.coords.altitude,
      accuracy: loc.coords.accuracy ?? 10,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      timestamp: loc.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Subscribes to continuous foreground location updates
 */
export async function subscribeToForegroundLocation(
  onLocationUpdate: (point: RawGPSPoint) => void,
  timeIntervalMs: number = 5000,
  distanceIntervalMeters: number = 5
): Promise<Location.LocationSubscription | null> {
  try {
    const isServicesEnabled = await Location.isLocationServicesEnabledAsync().catch(() => false);
    if (!isServicesEnabled) {
      return null;
    }

    const perm = await requestForegroundLocationPermission();
    if (!perm.granted) {
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: timeIntervalMs,
        distanceInterval: distanceIntervalMeters,
      },
      (loc) => {
        onLocationUpdate({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude,
          accuracy: loc.coords.accuracy ?? 10,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: loc.timestamp,
        });
      }
    );
    return subscription;
  } catch {
    return null;
  }
}
