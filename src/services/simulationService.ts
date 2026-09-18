import { DEMO_SCENARIO_PRESETS, DemoScenarioPreset } from '../constants/demoData';
import { RawGPSPoint } from '../types/evidence';

export class SimulationService {
  private static activePreset: DemoScenarioPreset | null = null;
  private static isSimulationMode: boolean = false;

  static getPresets(): DemoScenarioPreset[] {
    return DEMO_SCENARIO_PRESETS;
  }

  static getPresetById(id: string): DemoScenarioPreset | undefined {
    return DEMO_SCENARIO_PRESETS.find((p) => p.id === id);
  }

  static setActivePreset(preset: DemoScenarioPreset | null) {
    this.activePreset = preset;
    this.isSimulationMode = preset !== null;
  }

  static getActivePreset(): DemoScenarioPreset | null {
    return this.activePreset;
  }

  static isSimulating(): boolean {
    return this.isSimulationMode;
  }

  static setSimulationMode(enabled: boolean) {
    this.isSimulationMode = enabled;
    if (!enabled) {
      this.activePreset = null;
    }
  }

  static generateSimulatedGpsPoint(preset?: DemoScenarioPreset): RawGPSPoint {
    const p = preset || this.activePreset || DEMO_SCENARIO_PRESETS[0];
    return {
      latitude: p.simulatedGps.latitude,
      longitude: p.simulatedGps.longitude,
      accuracy: p.simulatedGps.accuracy,
      timestamp: Date.now(),
      speed: 0,
      heading: 0,
      altitude: 920,
    };
  }
}
