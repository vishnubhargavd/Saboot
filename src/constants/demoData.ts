import { Delivery } from '../types/delivery';
import { RawGPSPoint } from '../types/evidence';

export interface DemoScenarioPreset {
  id: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D';
  title: string;
  subtitle: string;
  tag: string;
  expectedDecision: 'VERIFIED' | 'REJECTED' | 'REVIEW';
  targetDeliveryId: string;
  simulatedGps: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
  };
  dwellSeconds: number;
  callAttempted: boolean;
  callDurationSeconds: number;
  videoConsentStatus: 'granted' | 'not_requested' | 'timed_out' | 'denied';
  anomalyFlags: string[];
  description: string;
}

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'DEL-1001',
    trackingNumber: 'SBT-BLR-882190',
    customer: {
      id: 'CUST-401',
      name: 'Aditi Sharma',
      phone: '+91 98450 12345',
      preferredLanguage: 'English / Kannada',
    },
    address: {
      street: 'Tower 4, Flat 902, Sobha Silicon Oasis',
      unitOrFlat: 'T4-902',
      landmark: 'Near Hosa Road Junction',
      city: 'Bengaluru',
      postalCode: '560100',
      latitude: 12.8715,
      longitude: 77.6534,
      residenceCategory: 'gated_society',
    },
    packageDescription: 'Electronics — Sony Wireless ANC Headphones (High Value)',
    estimatedDeliveryWindow: '11:00 AM - 12:00 PM',
    status: 'IN_TRANSIT',
    createdAt: '2026-09-18T09:30:00Z',
    assignedDriverId: 'DRV-BLR-09',
    notes: 'Gate passcode: #4490 (Customer requested gate verification)',
  },
  {
    id: 'DEL-1002',
    trackingNumber: 'SBT-BLR-882191',
    customer: {
      id: 'CUST-402',
      name: 'Rahul Varma',
      phone: '+91 97412 88712',
    },
    address: {
      street: '12th Main Road, HAL 2nd Stage, Indiranagar',
      unitOrFlat: '#542',
      landmark: 'Behind Corner House',
      city: 'Bengaluru',
      postalCode: '560038',
      latitude: 12.9719,
      longitude: 77.6412,
      residenceCategory: 'individual_house',
    },
    packageDescription: 'Apparel & Footwear — Nike Running Shoes',
    estimatedDeliveryWindow: '12:15 PM - 01:00 PM',
    status: 'ASSIGNED',
    createdAt: '2026-09-18T09:45:00Z',
    assignedDriverId: 'DRV-BLR-09',
  },
  {
    id: 'DEL-1003',
    trackingNumber: 'SBT-BLR-882192',
    customer: {
      id: 'CUST-403',
      name: 'Sneha Kulkarni',
      phone: '+91 99001 44521',
    },
    address: {
      street: 'Green Glen Layout, Bellandur',
      unitOrFlat: 'B-301, Ferns Paradise',
      landmark: 'Opposite Shell Petrol Pump',
      city: 'Bengaluru',
      postalCode: '560103',
      latitude: 12.9298,
      longitude: 77.6743,
      residenceCategory: 'apartment',
    },
    packageDescription: 'Kitchenware — Espresso Machine',
    estimatedDeliveryWindow: '01:30 PM - 02:30 PM',
    status: 'ASSIGNED',
    createdAt: '2026-09-18T10:00:00Z',
    assignedDriverId: 'DRV-BLR-09',
  },
  {
    id: 'DEL-1004',
    trackingNumber: 'SBT-BLR-882193',
    customer: {
      id: 'CUST-404',
      name: 'Manoj Hegde',
      phone: '+91 98860 33119',
    },
    address: {
      street: '14th Main, 7th Sector, HSR Layout',
      unitOrFlat: 'Villa 12, Prestige Ferns',
      landmark: 'Near BDA Complex',
      city: 'Bengaluru',
      postalCode: '560102',
      latitude: 12.9116,
      longitude: 77.6389,
      residenceCategory: 'gated_society',
    },
    packageDescription: 'Medicine / Perishables — Cold Storage Pack',
    estimatedDeliveryWindow: '03:00 PM - 04:00 PM',
    status: 'ASSIGNED',
    createdAt: '2026-09-18T10:15:00Z',
    assignedDriverId: 'DRV-BLR-09',
  },
];

export const DEMO_SCENARIO_PRESETS: DemoScenarioPreset[] = [
  {
    id: 'SCENARIO_A',
    title: 'Scenario A: Genuine Attempt (Gated Society)',
    subtitle: 'Inside 50m geofence, 158s dwell, call completed, video consent approved',
    tag: 'Genuine Attempt',
    expectedDecision: 'VERIFIED',
    targetDeliveryId: 'DEL-1001',
    simulatedGps: {
      latitude: 12.8717, // ~38m from destination
      longitude: 77.6536,
      accuracy: 6,
      distanceMeters: 38,
    },
    dwellSeconds: 158, // exceeds 150s requirement for gated society
    callAttempted: true,
    callDurationSeconds: 24,
    videoConsentStatus: 'granted',
    anomalyFlags: [],
    description: 'Driver navigated to Sobha Silicon Oasis, waited 158s at the gate/door, called the customer for 24s, and obtained consented video evidence.',
  },
  {
    id: 'SCENARIO_B',
    title: 'Scenario B: Insufficient Attempt (Drive-By / Remote)',
    subtitle: '3.2km away from address, 8s dwell, no phone call made',
    tag: 'Falsified Claim',
    expectedDecision: 'REJECTED',
    targetDeliveryId: 'DEL-1001',
    simulatedGps: {
      latitude: 12.9000, // 3.2km away
      longitude: 77.6534,
      accuracy: 8,
      distanceMeters: 3200,
    },
    dwellSeconds: 8,
    callAttempted: false,
    callDurationSeconds: 0,
    videoConsentStatus: 'not_requested',
    anomalyFlags: ['DISTANCE_EXCEEDED', 'INSUFFICIENT_DWELL', 'NO_CALL_ATTEMPTED'],
    description: 'Driver claimed customer was unavailable while still 3.2km away, with only 8s of recorded dwell and zero call attempts.',
  },
  {
    id: 'SCENARIO_C',
    title: 'Scenario C: Ambiguous Telemetry / Poor GPS',
    subtitle: 'Degraded GPS accuracy (68m uncertainty), inconclusive call duration',
    tag: 'Borderline Evidence',
    expectedDecision: 'REVIEW',
    targetDeliveryId: 'DEL-1001',
    simulatedGps: {
      latitude: 12.8719,
      longitude: 77.6538,
      accuracy: 68, // very poor accuracy
      distanceMeters: 45,
    },
    dwellSeconds: 152,
    callAttempted: true,
    callDurationSeconds: 3, // very short ring
    videoConsentStatus: 'not_requested',
    anomalyFlags: ['POOR_GPS_ACCURACY_UNCERTAINTY', 'SHORT_CALL_DURATION'],
    description: 'Driver was near destination, but GPS horizontal uncertainty was 68m and the call disconnected after 3 seconds. Sent to Ops review.',
  },
  {
    id: 'SCENARIO_D',
    title: 'Scenario D: Sub-Threshold Dwell & Consent Timeout',
    subtitle: '48m distance, 110s/150s dwell, consent timed out without response',
    tag: 'Dwell Gap',
    expectedDecision: 'REVIEW',
    targetDeliveryId: 'DEL-1001',
    simulatedGps: {
      latitude: 12.8718,
      longitude: 77.6535,
      accuracy: 10,
      distanceMeters: 48,
    },
    dwellSeconds: 110, // 110s is < 150s required for gated society
    callAttempted: true,
    callDurationSeconds: 18,
    videoConsentStatus: 'timed_out',
    anomalyFlags: ['SUB_THRESHOLD_DWELL_TIME', 'VIDEO_CONSENT_TIMEOUT'],
    description: 'Driver left after 110s (below the 150s gated society requirement) and the customer video consent link timed out.',
  },
];
