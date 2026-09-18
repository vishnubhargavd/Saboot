import * as Location from 'expo-location';
import { RawGPSPoint } from '../types/evidence';

/**
 * Computes the great-circle distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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
 * Requests foreground location permissions from the device.
 */
export async function requestForegroundLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
      status,
    };
  } catch (error) {
    console.warn('Error requesting location permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.DENIED,
    };
  }
}

/**
 * Fetches single current location snapshot.
 */
export async function getCurrentRawLocation(): Promise<RawGPSPoint | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
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
  } catch (error) {
    console.warn('Error fetching current position:', error);
    return null;
  }
}

/**
 * Subscribes to continuous foreground location updates (every 5-10s).
 */
export async function subscribeToForegroundLocation(
  onLocationUpdate: (point: RawGPSPoint) => void,
  timeIntervalMs: number = 5000,
  distanceIntervalMeters: number = 5
): Promise<Location.LocationSubscription | null> {
  try {
    const perm = await requestForegroundLocationPermission();
    if (!perm.granted) return null;

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
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
  } catch (error) {
    console.warn('Error subscribing to foreground location:', error);
    return null;
  }
}
