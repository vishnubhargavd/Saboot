/**
 * Saboot Development Seed Fixtures
 * 
 * Isolated test/development fixtures.
 * STRICT RULE: Never loaded in production (NODE_ENV === 'production').
 */

const SEED_DELIVERIES = [
  {
    id: 'DEL-ASR-01',
    trackingNumber: 'SBT-BLR-550101',
    customer: { id: 'CUST-ASR-01', name: 'Abhinav Kamutala', phone: '+91 90191 44983', email: 'abhinavkx@gmail.com' },
    address: { street: '44, 23rd Cross Rd, Parangi Palaya, Sector 2, HSR Layout, Bengaluru, Karnataka 560102', unitOrFlat: 'Flat 101, Block A, Asritha Lotus Residency', landmark: 'Near 24th Main Road / Parangi Palaya', city: 'Bengaluru', postalCode: '560102', latitude: 12.9080, longitude: 77.6475, lat: 12.9080, lng: 77.6475, residenceCategory: 'apartment' },
    packageDescription: 'Electronics — Apple iPad Pro 11-inch M4 with Magic Keyboard',
    estimatedDeliveryWindow: '10:00 AM - 11:00 AM',
    status: 'IN_TRANSIT',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 4,
    auditId: 'AUD-ASR-550101',
    decision: 'IN_TRANSIT',
    decisionReason: 'Order in transit to Asritha Lotus Residency Flat 101.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1001',
    trackingNumber: 'SBT-BLR-882190',
    customer: { id: 'CUST-101', name: 'Vishnu Bhargav', phone: '+91 90191 44983' },
    address: { street: 'Tower 4, Flat 902, Sobha Silicon Oasis', city: 'Bengaluru', postalCode: '560100', residenceCategory: 'gated_society', latitude: 12.8715, longitude: 77.6534, lat: 12.8715, lng: 77.6534 },
    packageDescription: 'Electronics — Sony Wireless ANC Headphones',
    estimatedDeliveryWindow: '10:00 AM - 11:30 AM',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'VERIFIED',
    distanceMeters: 38,
    dwellSeconds: 158,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDuration: 24,
    gpsAccuracy: 6,
    auditId: 'AUD-7K99-M42A',
    decision: 'VERIFIED',
    decisionReason: 'All mandatory physical (38m/50m), residence dwell (158s/150s), and telephony criteria (24s) verified.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1002',
    trackingNumber: 'SBT-BLR-882191',
    customer: { id: 'CUST-102', name: 'Rahul Varma', phone: '+91 97412 88712' },
    address: { street: '12th Main Road, HAL 2nd Stage, Indiranagar', city: 'Bengaluru', postalCode: '560038', residenceCategory: 'individual_house', latitude: 12.9719, longitude: 77.6412, lat: 12.9719, lng: 77.6412 },
    packageDescription: 'Apparel — Nike Running Shoes',
    estimatedDeliveryWindow: '11:00 AM - 12:30 PM',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'REJECTED',
    distanceMeters: 3200,
    dwellSeconds: 8,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 8,
    auditId: 'AUD-2R81-X91C',
    decision: 'REJECTED',
    decisionReason: 'Zero-trust check failed: Driver was 3.2km away from address with only 8s recorded dwell and zero calls.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1003',
    trackingNumber: 'SBT-BLR-882192',
    customer: { id: 'CUST-103', name: 'Sneha Kulkarni', phone: '+91 99001 44521' },
    address: { street: 'Green Glen Layout, Bellandur', city: 'Bengaluru', postalCode: '560103', residenceCategory: 'apartment', latitude: 12.9298, longitude: 77.6743, lat: 12.9298, lng: 77.6743 },
    packageDescription: 'Kitchenware — Espresso Machine',
    estimatedDeliveryWindow: '01:00 PM - 02:00 PM',
    driver: 'Sunil Rao (Unit 12 - DRV-BLR-12)',
    assignedDriverId: 'DRV-BLR-12',
    status: 'REVIEW',
    distanceMeters: 32,
    dwellSeconds: 154,
    requiredDwellSeconds: 120,
    callAttempted: true,
    callDuration: 28,
    gpsAccuracy: 12,
    auditId: 'AUD-9M32-P18Q',
    decision: 'REVIEW',
    decisionReason: 'Customer Unavailable claim: 6s doorstep footage uploaded. Awaiting supervisor approval to confirm customer absence.',
    requiresAdminApproval: true,
    adminApprovalStatus: 'PENDING',
    videoProofUri: 'doorstep_absence_clip_1003.mp4',
    createdAt: new Date().toISOString()
  }
];

module.exports = {
  SEED_DELIVERIES
};
