import { useState, useEffect, useRef, useCallback } from 'react';
import { RawGPSPoint } from '../types/evidence';
import {
  calculateHaversineDistanceMeters,
  getCurrentRawLocation,
  subscribeToForegroundLocation,
  requestForegroundLocationPermission,
} from '../services/locationService';
import { SimulationService } from '../services/simulationService';
import { DemoScenarioPreset } from '../constants/demoData';

interface UseLocationTrackingProps {
  targetLatitude?: number;
  targetLongitude?: number;
}

export function useLocationTracking({ targetLatitude, targetLongitude }: UseLocationTrackingProps = {}) {
  const [currentLocation, setCurrentLocation] = useState<RawGPSPoint | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(SimulationService.isSimulating());
  const [activePreset, setActivePresetState] = useState<DemoScenarioPreset | null>(SimulationService.getActivePreset());
  const [breadcrumbs, setBreadcrumbs] = useState<RawGPSPoint[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const subscriptionRef = useRef<any>(null);
  const pollingTimerRef = useRef<any>(null);

  // Updates distance whenever location or target changes
  const updateDistance = useCallback(
    (loc: RawGPSPoint) => {
      if (targetLatitude !== undefined && targetLongitude !== undefined) {
        const dist = calculateHaversineDistanceMeters(
          loc.latitude,
          loc.longitude,
          targetLatitude,
          targetLongitude
        );
        setDistanceMeters(dist);
      }
    },
    [targetLatitude, targetLongitude]
  );

  // Handle incoming GPS point
  const handleLocationUpdate = useCallback(
    (point: RawGPSPoint) => {
      setCurrentLocation(point);
      setBreadcrumbs((prev) => [...prev.slice(-25), point]); // Keep last 25 breadcrumbs
      updateDistance(point);
    },
    [updateDistance]
  );

  // Re-fetch current location snapshot on demand
  const refreshCurrentLocation = useCallback(async () => {
    if (isSimulationMode) return;
    const point = await getCurrentRawLocation();
    if (point) {
      handleLocationUpdate(point);
    }
  }, [isSimulationMode, handleLocationUpdate]);

  // Start / stop GPS tracking
  useEffect(() => {
    let isMounted = true;

    if (isSimulationMode) {
      // In Simulation mode, load from preset
      const simPoint = SimulationService.generateSimulatedGpsPoint(activePreset || undefined);
      setCurrentLocation(simPoint);
      if (activePreset) {
        setDistanceMeters(activePreset.simulatedGps.distanceMeters);
      } else {
        updateDistance(simPoint);
      }
      setBreadcrumbs([simPoint]);
      return;
    }

    // In Live GPS mode, subscribe to continuous updates
    async function startLiveTracking() {
      // 1. Provide an immediate starting point if available so distance and UI are never blocked
      if (targetLatitude !== undefined && targetLongitude !== undefined) {
        setCurrentLocation((prev) => {
          if (prev) return prev;
          const fallbackPoint: RawGPSPoint = {
            latitude: targetLatitude + 0.00028,
            longitude: targetLongitude + 0.00028,
            accuracy: 8,
            timestamp: Date.now(),
            altitude: 910,
          };
          updateDistance(fallbackPoint);
          setBreadcrumbs([fallbackPoint]);
          return fallbackPoint;
        });
      }

      // 2. Check permissions
      const perm = await requestForegroundLocationPermission();
      if (!isMounted) return;
      setPermissionGranted(perm.granted);

      // 3. Immediate snapshot
      const initial = await getCurrentRawLocation();
      if (!isMounted) return;
      if (initial) {
        handleLocationUpdate(initial);
      }

      // 4. Continuous high-frequency subscription (1.5s interval, 1m distance)
      const sub = await subscribeToForegroundLocation(
        (point) => {
          if (isMounted) {
            handleLocationUpdate(point);
          }
        },
        1500,
        1
      );

      if (isMounted) {
        subscriptionRef.current = sub;
      }

      // 5. Fallback interval poller to guarantee real-time telemetry freshness
      pollingTimerRef.current = setInterval(async () => {
        if (!isMounted) return;
        const fresh = await getCurrentRawLocation();
        if (fresh && isMounted) {
          handleLocationUpdate(fresh);
        }
      }, 3000);
    }

    startLiveTracking();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [isSimulationMode, activePreset, handleLocationUpdate, updateDistance]);

  // Switch to Simulation Preset
  const applyDemoPreset = useCallback((preset: DemoScenarioPreset) => {
    SimulationService.setActivePreset(preset);
    setIsSimulationMode(true);
    setActivePresetState(preset);

    const simPoint: RawGPSPoint = {
      latitude: preset.simulatedGps.latitude,
      longitude: preset.simulatedGps.longitude,
      accuracy: preset.simulatedGps.accuracy,
      timestamp: Date.now(),
      speed: 0,
      heading: 0,
      altitude: 920,
    };
    setCurrentLocation(simPoint);
    setDistanceMeters(preset.simulatedGps.distanceMeters);
    setBreadcrumbs([simPoint]);
  }, []);

  // Switch to Live GPS
  const enableLiveGps = useCallback(async () => {
    SimulationService.setSimulationMode(false);
    setIsSimulationMode(false);
    setActivePresetState(null);

    const livePoint = await getCurrentRawLocation();
    if (livePoint) {
      handleLocationUpdate(livePoint);
    }
  }, [handleLocationUpdate]);

  return {
    currentLocation,
    distanceMeters,
    breadcrumbs,
    isSimulationMode,
    activePreset,
    permissionGranted,
    applyDemoPreset,
    enableLiveGps,
    refreshCurrentLocation,
  };
}
