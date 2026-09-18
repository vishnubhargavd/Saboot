import { useState, useEffect, useRef, useCallback } from 'react';
import { RawGPSPoint } from '../types/evidence';
import { calculateHaversineDistanceMeters, getCurrentRawLocation, subscribeToForegroundLocation } from '../services/locationService';
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

  // Updates distance whenever location or target changes
  const updateDistance = useCallback((loc: RawGPSPoint) => {
    if (targetLatitude !== undefined && targetLongitude !== undefined) {
      const dist = calculateHaversineDistanceMeters(
        loc.latitude,
        loc.longitude,
        targetLatitude,
        targetLongitude
      );
      setDistanceMeters(dist);
    }
  }, [targetLatitude, targetLongitude]);

  // Handle incoming GPS point
  const handleLocationUpdate = useCallback((point: RawGPSPoint) => {
    setCurrentLocation(point);
    setBreadcrumbs((prev) => [...prev.slice(-20), point]); // keep recent 20 points
    updateDistance(point);
  }, [updateDistance]);

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

    // In Live GPS mode, subscribe to foreground location
    async function startLiveTracking() {
      const initial = await getCurrentRawLocation();
      if (!isMounted) return;

      if (initial) {
        handleLocationUpdate(initial);
      }

      const sub = await subscribeToForegroundLocation((point) => {
        if (isMounted) {
          handleLocationUpdate(point);
        }
      }, 5000, 5);

      if (isMounted) {
        subscriptionRef.current = sub;
      }
    }

    startLiveTracking();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
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
  };
}
