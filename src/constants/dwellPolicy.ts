import { ResidenceCategory } from '../types/delivery';

export interface ResidenceDwellRule {
  category: ResidenceCategory;
  displayName: string;
  requiredDwellSeconds: number;
  description: string;
  rationale: string;
  icon: string;
}

export const DWELL_POLICY_CONFIG: Record<ResidenceCategory, ResidenceDwellRule> = {
  individual_house: {
    category: 'individual_house',
    displayName: 'Individual House',
    requiredDwellSeconds: 90,
    description: 'Direct door / gate access',
    rationale: 'Direct access from street to door with minimal barrier.',
    icon: 'home',
  },
  apartment: {
    category: 'apartment',
    displayName: 'Apartment Building',
    requiredDwellSeconds: 120,
    description: 'Lift / stairs + unit navigation',
    rationale: 'Elevator/stairwell navigation and floor level search.',
    icon: 'business',
  },
  gated_society: {
    category: 'gated_society',
    displayName: 'Gated Society',
    requiredDwellSeconds: 150,
    description: 'Security gate check-in + campus travel',
    rationale: 'Security gate registration, passcode entry, and intra-campus travel to unit.',
    icon: 'shield-checkmark',
  },
};

export const PROXIMITY_POLICY = {
  maxAllowedDistanceMeters: 50,
  gpsJitterToleranceMeters: 15,
  maxAcceptableGpsAccuracyMeters: 30, // beyond this, telemetry is flagged ambiguous
  maxPlausibleDriverSpeedKmh: 45, // speed anomalies within attempt window
};

export function getDwellRule(category?: string | null): ResidenceDwellRule {
  if (category && (DWELL_POLICY_CONFIG as Record<string, ResidenceDwellRule>)[category]) {
    return (DWELL_POLICY_CONFIG as Record<string, ResidenceDwellRule>)[category];
  }
  return DWELL_POLICY_CONFIG.individual_house;
}
