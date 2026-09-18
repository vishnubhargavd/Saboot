import { Platform } from 'react-native';
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
 * Checks and requests foreground location permissions across Web, iOS & Android
 */
export async function requestForegroundLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'navigator' in window && 'geolocation' in navigator) {
        return {
          granted: true,
          canAskAgain: true,
          status: Location.PermissionStatus.GRANTED,
        };
      }
    }

    const existing = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (existing?.granted) {
      return {
        granted: true,
        canAskAgain: existing.canAskAgain,
        status: existing.status,
      };
    }

    const requested = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (requested?.granted) {
      return {
        granted: true,
        canAskAgain: requested.canAskAgain,
        status: requested.status,
      };
    }

    return {
      granted: false,
      canAskAgain: requested?.canAskAgain ?? true,
      status: requested?.status ?? Location.PermissionStatus.DENIED,
    };
  } catch (err) {
    console.warn('Location permission request failed:', err);
    return {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.DENIED,
    };
  }
}

/**
 * Fetches single current location snapshot with graceful fallback across Web & Native
 */
export async function getCurrentRawLocation(): Promise<RawGPSPoint | null> {
  // Web fallback using browser geolocation
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'navigator' in window && 'geolocation' in navigator) {
    return new Promise((resolve) => {
      // First try standard accuracy (faster and far more reliable on desktop browsers than highAccuracy)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp || Date.now(),
          });
        },
        () => {
          // If standard accuracy failed, try high accuracy as second attempt
          navigator.geolocation.getCurrentPosition(
            (posHigh) => {
              resolve({
                latitude: posHigh.coords.latitude,
                longitude: posHigh.coords.longitude,
                altitude: posHigh.coords.altitude,
                accuracy: Math.round(posHigh.coords.accuracy || 10),
                speed: posHigh.coords.speed,
                heading: posHigh.coords.heading,
                timestamp: posHigh.timestamp || Date.now(),
              });
            },
            (errHigh) => {
              console.warn('Web geolocation error:', errHigh);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 4000, maximumAge: 3000 }
          );
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 5000 }
      );
    });
  }

  try {
    const perm = await requestForegroundLocationPermission();
    if (!perm.granted) {
      return null;
    }

    // Try last known position first for instantaneous response
    const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);

    const isServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!isServicesEnabled) {
      console.warn('Location services disabled on device');
      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          altitude: lastKnown.coords.altitude,
          accuracy: Math.round(lastKnown.coords.accuracy ?? 15),
          speed: lastKnown.coords.speed,
          heading: lastKnown.coords.heading,
          timestamp: lastKnown.timestamp,
        };
      }
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => null);

    const activeLoc = loc || lastKnown;
    if (!activeLoc) return null;

    return {
      latitude: activeLoc.coords.latitude,
      longitude: activeLoc.coords.longitude,
      altitude: activeLoc.coords.altitude,
      accuracy: Math.round(activeLoc.coords.accuracy ?? 10),
      speed: activeLoc.coords.speed,
      heading: activeLoc.coords.heading,
      timestamp: activeLoc.timestamp,
    };
  } catch (err) {
    console.warn('getCurrentRawLocation native error:', err);
    return null;
  }
}

/**
 * Subscribes to continuous foreground location updates with real-time accuracy
 */
export async function subscribeToForegroundLocation(
  onLocationUpdate: (point: RawGPSPoint) => void,
  timeIntervalMs: number = 1500,
  distanceIntervalMeters: number = 1
): Promise<Location.LocationSubscription | null> {
  // Web Geolocation Watcher
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'navigator' in window && 'geolocation' in navigator) {
    try {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          onLocationUpdate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: Math.round(pos.coords.accuracy || 8),
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp || Date.now(),
          });
        },
        (err) => {
          console.warn('Web watchPosition notice:', err);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 1000 }
      );

      return {
        remove: () => {
          navigator.geolocation.clearWatch(watchId);
        },
      } as Location.LocationSubscription;
    } catch (err) {
      console.warn('Failed to start web geolocation watch:', err);
      return null;
    }
  }

  // Native iOS / Android Location Watcher
  try {
    const perm = await requestForegroundLocationPermission();
    if (!perm.granted) {
      return null;
    }

    const isServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!isServicesEnabled) {
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
          accuracy: Math.round(loc.coords.accuracy ?? 10),
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: loc.timestamp,
        });
      }
    );
    return subscription;
  } catch (err) {
    console.warn('Failed to start native location watcher:', err);
    return null;
  }
}
