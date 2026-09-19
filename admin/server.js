/**
 * Saboot Admin & Real-Time Sync Server
 * 
 * Serves the Admin Operations Console on port 3000 and provides
 * real-time REST + SSE sync endpoints for the Mobile Driver App (iOS/Android/Web).
 * Zero external dependencies (uses Node.js core http, fs, path, url).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all interfaces so mobile devices on Wi-Fi can connect
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'deliveries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial 8 deliveries (rich dataset for both driver app and admin portal)
const DEFAULT_DELIVERIES = [
  {
    id: 'DEL-1001',
    trackingNumber: 'SBT-BLR-882190',
    customer: { id: 'CUST-401', name: 'Vishnu Bhargav', phone: '+91 90191 44983' },
    address: { street: 'Tower 4, Flat 902, Sobha Silicon Oasis', unitOrFlat: 'T4-902', landmark: 'Near Hosa Road Junction', city: 'Bengaluru', postalCode: '560100', latitude: 12.8715, longitude: 77.6534, residenceCategory: 'gated_society' },
    packageDescription: 'Electronics — Sony Wireless ANC Headphones (High Value)',
    estimatedDeliveryWindow: '11:00 AM - 12:00 PM',
    status: 'IN_TRANSIT',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 38,
    dwellSeconds: 158,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDuration: 28,
    gpsAccuracy: 6,
    auditId: 'AUD-882190-GENUINE',
    decision: 'REVIEW',
    decisionReason: 'Order in progress — driver active on route.',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'DEL-1002',
    trackingNumber: 'SBT-BLR-882191',
    customer: { id: 'CUST-402', name: 'Rahul Varma', phone: '+91 97412 88712' },
    address: { street: '12th Main Road, HAL 2nd Stage, Indiranagar', unitOrFlat: '#542', landmark: 'Behind Corner House', city: 'Bengaluru', postalCode: '560038', latitude: 12.9719, longitude: 77.6412, residenceCategory: 'individual_house' },
    packageDescription: 'Apparel & Footwear — Nike Running Shoes',
    estimatedDeliveryWindow: '12:15 PM - 01:00 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 25,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882191-ASSIGNED',
    decision: 'REVIEW',
    decisionReason: 'Assigned to driver — waiting for arrival.',
    createdAt: new Date(Date.now() - 3000000).toISOString()
  },
  {
    id: 'DEL-1003',
    trackingNumber: 'SBT-BLR-882192',
    customer: { id: 'CUST-403', name: 'Sneha Kulkarni', phone: '+91 99001 44521' },
    address: { street: 'Green Glen Layout, Bellandur', unitOrFlat: 'B-301, Ferns Paradise', landmark: 'Opposite Shell Petrol Pump', city: 'Bengaluru', postalCode: '560103', latitude: 12.9298, longitude: 77.6743, residenceCategory: 'apartment' },
    packageDescription: 'Kitchenware — Espresso Machine',
    estimatedDeliveryWindow: '01:30 PM - 02:30 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 30,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 7,
    auditId: 'AUD-882192-ASSIGNED',
    decision: 'REVIEW',
    decisionReason: 'Assigned to driver — waiting for dispatch route.',
    createdAt: new Date(Date.now() - 2400000).toISOString()
  },
  {
    id: 'DEL-1004',
    trackingNumber: 'SBT-BLR-882193',
    customer: { id: 'CUST-404', name: 'Manoj Hegde', phone: '+91 98860 33119' },
    address: { street: '14th Main, 7th Sector, HSR Layout', unitOrFlat: 'Villa 12, Prestige Ferns', landmark: 'Near BDA Complex', city: 'Bengaluru', postalCode: '560102', latitude: 12.9116, longitude: 77.6389, residenceCategory: 'gated_society' },
    packageDescription: 'Medicine / Perishables — Cold Storage Pack',
    estimatedDeliveryWindow: '03:00 PM - 04:00 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 45,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882193-ASSIGNED',
    decision: 'REVIEW',
    decisionReason: 'Cold storage shipment assigned to driver.',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'DEL-1005',
    trackingNumber: 'SBT-BLR-882194',
    customer: { id: 'CUST-405', name: 'Priya Nambiar', phone: '+91 98452 33190' },
    address: { street: 'Prestige Falcon City, Kanakapura Road', unitOrFlat: 'B-1402', landmark: 'Near Metro Station', city: 'Bengaluru', postalCode: '560062', latitude: 12.8912, longitude: 77.5621, residenceCategory: 'gated_society' },
    packageDescription: 'Electronics — Apple iPad Air M2 & Apple Pencil',
    estimatedDeliveryWindow: '04:00 PM - 05:00 PM',
    status: 'IN_TRANSIT',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 28,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882194-NEW',
    decision: 'REVIEW',
    decisionReason: 'Requires doorstep delivery; Resident ID verification at lobby.',
    createdAt: new Date(Date.now() - 1200000).toISOString()
  },
  {
    id: 'DEL-1006',
    trackingNumber: 'SBT-BLR-882195',
    customer: { id: 'CUST-406', name: 'Arvind Swaminathan', phone: '+91 98801 77241' },
    address: { street: 'RMZ Ecospace, Outer Ring Road, Bellandur', unitOrFlat: 'Bay 4, 3rd Floor', landmark: 'Building 2A', city: 'Bengaluru', postalCode: '560103', latitude: 12.9260, longitude: 77.6830, residenceCategory: 'apartment' },
    packageDescription: 'Corporate Handoff — Urgent Signed Legal Documents',
    estimatedDeliveryWindow: '05:15 PM - 06:00 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 35,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882195-NEW',
    decision: 'REVIEW',
    decisionReason: 'Corporate legal documents — security desk drop allowed.',
    createdAt: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'DEL-1007',
    trackingNumber: 'SBT-BLR-882196',
    customer: { id: 'CUST-407', name: 'Ananya Deshmukh', phone: '+91 97310 99420' },
    address: { street: '7th Cross, 4th Block, Koramangala', unitOrFlat: '#88', landmark: 'Near Maharaja Signal', city: 'Bengaluru', postalCode: '560034', latitude: 12.9344, longitude: 77.6258, residenceCategory: 'individual_house' },
    packageDescription: 'Perishables — Temperature Sensitive Biological Sample Pack',
    estimatedDeliveryWindow: '06:15 PM - 07:00 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882196-NEW',
    decision: 'REVIEW',
    decisionReason: 'Keep in insulated container until doorstep handoff.',
    createdAt: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'DEL-1008',
    trackingNumber: 'SBT-BLR-882197',
    customer: { id: 'CUST-408', name: 'Vikramaditya Roy', phone: '+91 96118 22340' },
    address: { street: 'Brigade Gateway, Dr. Rajkumar Road, Malleshwaram', unitOrFlat: 'A-1104', landmark: 'Next to Orion Mall', city: 'Bengaluru', postalCode: '560055', latitude: 13.0118, longitude: 77.5552, residenceCategory: 'gated_society' },
    packageDescription: 'Luxury Goods — Swiss Chronograph Watch',
    estimatedDeliveryWindow: '07:30 PM - 08:30 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 40,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882197-NEW',
    decision: 'REVIEW',
    decisionReason: 'Direct customer handoff mandatory + video verification.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1009',
    trackingNumber: 'SBT-BLR-882198',
    customer: { id: 'CUST-409', name: 'Rohan Sen', phone: '+91 98450 11992' },
    address: { street: 'Prestige Shantiniketan, ITPL Main Road, Whitefield', unitOrFlat: 'Tower 16, Flat 1201', landmark: 'Opposite Manipal Hospital', city: 'Bengaluru', postalCode: '560066', latitude: 12.9892, longitude: 77.7281, residenceCategory: 'gated_society' },
    packageDescription: 'Computing — MacBook Pro M3 MagSafe Charger & Thunderbolt Hub',
    estimatedDeliveryWindow: '09:00 AM - 10:00 AM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 30,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882198-NEW',
    decision: 'REVIEW',
    decisionReason: 'Call on arrival for visitor gate entry passcode.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1010',
    trackingNumber: 'SBT-BLR-882199',
    customer: { id: 'CUST-410', name: 'Meera Iyer', phone: '+91 97401 22883' },
    address: { street: '100 Feet Road, HAL 2nd Stage, Indiranagar', unitOrFlat: 'Penthouse 4B', landmark: 'Near Toit Brewpub', city: 'Bengaluru', postalCode: '560038', latitude: 12.9734, longitude: 77.6402, residenceCategory: 'apartment' },
    packageDescription: 'Personal Care — Dyson Airwrap Multi-Styler',
    estimatedDeliveryWindow: '10:15 AM - 11:00 AM',
    status: 'IN_TRANSIT',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 22,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 4,
    auditId: 'AUD-882199-NEW',
    decision: 'REVIEW',
    decisionReason: 'Deliver to 4th floor doorstep; elevator functional.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1011',
    trackingNumber: 'SBT-BLR-882200',
    customer: { id: 'CUST-411', name: 'Karthik Reddy', phone: '+91 99802 33774' },
    address: { street: '27th Main, Sector 1, HSR Layout', unitOrFlat: '#128', landmark: 'Near NIFT Campus', city: 'Bengaluru', postalCode: '560102', latitude: 12.9152, longitude: 77.6514, residenceCategory: 'individual_house' },
    packageDescription: 'Gourmet — Nespresso Coffee Pods & Glass Decanter Set',
    estimatedDeliveryWindow: '11:15 AM - 12:00 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 18,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882200-NEW',
    decision: 'REVIEW',
    decisionReason: 'Ring doorbell twice; leave on porch if no response.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1012',
    trackingNumber: 'SBT-BLR-882201',
    customer: { id: 'CUST-412', name: 'Deepa Balakrishnan', phone: '+91 98863 44665' },
    address: { street: 'Salarpuria Sattva Greenage, Hosur Road, Bommanahalli', unitOrFlat: 'Alpine Tower, Flat 804', landmark: 'Near Oxford College', city: 'Bengaluru', postalCode: '560068', latitude: 12.9022, longitude: 77.6254, residenceCategory: 'gated_society' },
    packageDescription: 'Farm Produce — Fresh Organic Artisanal Dairy Basket',
    estimatedDeliveryWindow: '12:30 PM - 01:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 36,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882201-NEW',
    decision: 'REVIEW',
    decisionReason: 'Perishable item; keep chilled.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1013',
    trackingNumber: 'SBT-BLR-882202',
    customer: { id: 'CUST-413', name: 'Aditya Singhania', phone: '+91 99014 55886' },
    address: { street: 'Lavelle Road, Shanthala Nagar, Ashok Nagar', unitOrFlat: 'Suite 302, Regency Heights', landmark: 'Near Bangalore Club', city: 'Bengaluru', postalCode: '560001', latitude: 12.9716, longitude: 77.5946, residenceCategory: 'apartment' },
    packageDescription: 'Stationery — Montblanc Meisterstück Fountain Pen Gold Coated',
    estimatedDeliveryWindow: '01:30 PM - 02:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 26,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882202-NEW',
    decision: 'REVIEW',
    decisionReason: 'High value insured package; signature and video required.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1014',
    trackingNumber: 'SBT-BLR-882203',
    customer: { id: 'CUST-414', name: 'Shreya Joshi', phone: '+91 97425 66997' },
    address: { street: '33rd Cross, 11th Main, 4th T Block, Jayanagar', unitOrFlat: '#412', landmark: 'Near Jayanagar Shopping Complex', city: 'Bengaluru', postalCode: '560041', latitude: 12.9254, longitude: 77.5938, residenceCategory: 'individual_house' },
    packageDescription: 'Handicrafts — Handcrafted Kashmiri Walnut Wood Keepsake Box',
    estimatedDeliveryWindow: '02:30 PM - 03:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882203-NEW',
    decision: 'REVIEW',
    decisionReason: 'Fragile handling mandatory.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1015',
    trackingNumber: 'SBT-BLR-882204',
    customer: { id: 'CUST-415', name: 'Farhan Akhtar', phone: '+91 98806 77118' },
    address: { street: 'Embassy GolfLinks, Intermediate Ring Road, Domlur', unitOrFlat: 'Pebble Beach Block B, 2nd Floor', landmark: 'Behind Dell Campus', city: 'Bengaluru', postalCode: '560071', latitude: 12.9515, longitude: 77.6482, residenceCategory: 'apartment' },
    packageDescription: 'Audio Gear — Bose QuietComfort Ultra Wireless Noise-Cancelling Earbuds',
    estimatedDeliveryWindow: '03:30 PM - 04:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 32,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882204-NEW',
    decision: 'REVIEW',
    decisionReason: 'Corporate park entry; show driver badge at security post.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1016',
    trackingNumber: 'SBT-BLR-882205',
    customer: { id: 'CUST-416', name: 'Tanvi Madhavan', phone: '+91 96117 88229' },
    address: { street: 'Godrej Platinum, Bellary Road, Hebbal', unitOrFlat: 'Tower B, Flat 1803', landmark: 'Near Esteem Mall', city: 'Bengaluru', postalCode: '560024', latitude: 13.0358, longitude: 77.5970, residenceCategory: 'gated_society' },
    packageDescription: 'Hardware — ASUS ROG GeForce RTX 4080 Super OC Edition',
    estimatedDeliveryWindow: '04:30 PM - 05:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 42,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882205-NEW',
    decision: 'REVIEW',
    decisionReason: 'Fragile electronic equipment; do not tilt box.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1017',
    trackingNumber: 'SBT-BLR-882206',
    customer: { id: 'CUST-417', name: 'Nikhil Kamath', phone: '+91 98458 99330' },
    address: { street: 'Sankey Road, Sadashivanagar', unitOrFlat: '#19', landmark: 'Opposite Sankey Tank Park', city: 'Bengaluru', postalCode: '560080', latitude: 13.0068, longitude: 77.5813, residenceCategory: 'individual_house' },
    packageDescription: 'Banking Courier — Tamper-Evident Physical Ledger Hardware Key',
    estimatedDeliveryWindow: '05:30 PM - 06:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 25,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882206-NEW',
    decision: 'REVIEW',
    decisionReason: 'Strict zero-trust delivery: biometric OTP handoff only.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1018',
    trackingNumber: 'SBT-BLR-882207',
    customer: { id: 'CUST-418', name: 'Pooja Sundaram', phone: '+91 99029 00441' },
    address: { street: 'Phoenix One Bangalore West, Dr. Rajkumar Road, Rajajinagar', unitOrFlat: 'Tower 4, Flat 2202', landmark: 'Opposite ISKCON Temple', city: 'Bengaluru', postalCode: '560010', latitude: 13.0102, longitude: 77.5518, residenceCategory: 'gated_society' },
    packageDescription: 'Luxury Apparel — Louis Vuitton Speedy Bandoulière Monogram Bag',
    estimatedDeliveryWindow: '06:30 PM - 07:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 38,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882207-NEW',
    decision: 'REVIEW',
    decisionReason: 'Resident requested video footage handoff confirmation.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1019',
    trackingNumber: 'SBT-BLR-882208',
    customer: { id: 'CUST-419', name: 'Varun Grover', phone: '+91 97430 11552' },
    address: { street: '80 Feet Road, 6th Block, Koramangala', unitOrFlat: 'Apartment 201, Green Leaf', landmark: 'Near Sony World Signal', city: 'Bengaluru', postalCode: '560095', latitude: 12.9372, longitude: 77.6271, residenceCategory: 'apartment' },
    packageDescription: 'Wellness — Wakefit Orthopedic Memory Foam Support Mattress',
    estimatedDeliveryWindow: '07:30 PM - 08:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 28,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882208-NEW',
    decision: 'REVIEW',
    decisionReason: 'Heavy parcel; doorstep assistance requested.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'DEL-1020',
    trackingNumber: 'SBT-BLR-882209',
    customer: { id: 'CUST-420', name: 'Ayesha Siddiqui', phone: '+91 98861 22663' },
    address: { street: 'Cunningham Road, Vasanth Nagar', unitOrFlat: '#45', landmark: 'Near Fatima Bakery', city: 'Bengaluru', postalCode: '560052', latitude: 12.9866, longitude: 77.5968, residenceCategory: 'individual_house' },
    packageDescription: 'Heirloom Jewelry — Antique Gold Filigree Appraisal Box',
    estimatedDeliveryWindow: '08:30 PM - 09:15 PM',
    status: 'ASSIGNED',
    driver: 'Ramesh Kumar (Unit 24 - DRV-BLR-09)',
    assignedDriverId: 'DRV-BLR-09',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882209-NEW',
    decision: 'REVIEW',
    decisionReason: 'High security parcel; mandatory tamper check before handoff.',
    createdAt: new Date().toISOString()
  }
];

// Load persisted deliveries or initialize with defaults
let deliveries = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    deliveries = JSON.parse(raw);
    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      deliveries = [...DEFAULT_DELIVERIES];
    }
  } else {
    deliveries = [...DEFAULT_DELIVERIES];
  }
} catch (e) {
  deliveries = [...DEFAULT_DELIVERIES];
}

// Always ensure all DEFAULT_DELIVERIES exist in the server's deliveries list
let needsSave = false;
for (const def of DEFAULT_DELIVERIES) {
  if (!deliveries.some((d) => d.id === def.id)) {
    deliveries.push(def);
    needsSave = true;
  }
}
saveDeliveries();

function saveDeliveries() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(deliveries, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Server] Error saving deliveries to disk:', err);
  }
}

// Active Server-Sent Events (SSE) Client Connections
const sseClients = new Set();
const recentEvents = []; // For polling fallback

function broadcastEvent(event) {
  const payload = {
    ...event,
    _id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    _t: Date.now()
  };

  recentEvents.push(payload);
  if (recentEvents.length > 200) recentEvents.shift();

  const formattedMsg = `data: ${JSON.stringify(payload)}\n\n`;

  sseClients.forEach((res) => {
    try {
      res.write(formattedMsg);
    } catch (e) {
      sseClients.delete(res);
    }
  });
}

// MIME Types for Admin static files & video streams
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  // CORS Headers for cross-origin mobile apps / web clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. SSE Real-Time Stream
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`: connected at ${new Date().toISOString()}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
    return;
  }

  // 2. Event Polling Fallback
  if (pathname === '/api/events/poll' && req.method === 'GET') {
    const since = parseInt(parsedUrl.query.since || '0', 10);
    const filtered = recentEvents.filter((e) => e._t > since);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: filtered, now: Date.now() }));
    return;
  }

  // 3. Post Event (Updates delivery state and broadcasts to all clients)
  if (pathname === '/api/events' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const event = JSON.parse(body);

        // Update in-memory deliveries array & persist to disk
        if (event.deliveryId) {
          const order = deliveries.find((d) => d.id === event.deliveryId || d.trackingNumber === event.deliveryId);
          if (order) {
            order.status = event.status || 'REVIEW';
            order.decision = event.status || 'REVIEW';
            order.requiresAdminApproval = event.extra?.requiresAdminApproval !== undefined ? event.extra.requiresAdminApproval : true;
            order.adminApprovalStatus = event.extra?.adminApprovalStatus || 'PENDING';
            if (event.videoProofUri) order.videoProofUri = event.videoProofUri;
            if (event.handoffType) order.handoffType = event.handoffType;
            if (event.auditId) order.auditId = event.auditId;
            if (event.extra?.decisionReason) order.decisionReason = event.extra.decisionReason;
            if (event.extra?.videoMetrics) order.videoMetrics = event.extra.videoMetrics;
            saveDeliveries();
          }
        }

        broadcastEvent(event);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // Video Proof Upload API (Zero-dependency Multipart + JSON + Raw stream parser)
  if (pathname === '/api/upload' && req.method === 'POST') {
    let chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        let fileName = (parsedUrl.query && parsedUrl.query.filename) || (req.headers['x-filename']) || `proof_${Date.now()}.mp4`;
        let fileBuffer = buffer;

        if (contentType.includes('application/json')) {
          const json = JSON.parse(buffer.toString('utf8'));
          fileName = (json.fileName || json.name || fileName).replace(/[^a-zA-Z0-9._-]/g, '');
          if (json.base64) {
            fileBuffer = Buffer.from(json.base64, 'base64');
          } else {
            fileBuffer = Buffer.from(json.content || '', 'utf8');
          }
        } else if (contentType.includes('multipart/form-data')) {
          const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
          const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : null;

          if (boundary) {
            const boundaryBuffer = Buffer.from(`--${boundary}`);
            const startIdx = buffer.indexOf(boundaryBuffer);
            if (startIdx !== -1) {
              const headerStart = startIdx + boundaryBuffer.length;
              let bodyStart = -1;
              const crlfIdx = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
              const lfIdx = buffer.indexOf(Buffer.from('\n\n'), headerStart);

              if (crlfIdx !== -1 && (lfIdx === -1 || crlfIdx < lfIdx)) {
                bodyStart = crlfIdx + 4;
              } else if (lfIdx !== -1) {
                bodyStart = lfIdx + 2;
              }

              if (bodyStart !== -1) {
                const headerText = buffer.slice(headerStart, bodyStart).toString('utf8');
                const fnMatch = headerText.match(/filename="?([^";\r\n]+)"?/i);
                if (fnMatch && fnMatch[1]) {
                  fileName = fnMatch[1].trim().replace(/[^a-zA-Z0-9._-]/g, '');
                }

                const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, bodyStart);
                let bodyEnd = buffer.length;
                if (nextBoundaryIdx !== -1) {
                  bodyEnd = nextBoundaryIdx;
                  if (bodyEnd >= 2 && buffer[bodyEnd - 2] === 13 && buffer[bodyEnd - 1] === 10) {
                    bodyEnd -= 2;
                  } else if (bodyEnd >= 1 && buffer[bodyEnd - 1] === 10) {
                    bodyEnd -= 1;
                  }
                }
                fileBuffer = buffer.slice(bodyStart, bodyEnd);
              }
            }
          }
        }

        if (!fileName.toLowerCase().endsWith('.mp4') && !fileName.toLowerCase().endsWith('.mov')) {
          fileName = `${fileName}.mp4`;
        }
        fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');

        const targetPath = path.join(UPLOADS_DIR, fileName);
        fs.writeFileSync(targetPath, fileBuffer);

        const videoUrl = `/api/uploads/${fileName}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: videoUrl, fileName }));
      } catch (err) {
        console.error('[Upload API] Error saving file:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to upload video' }));
      }
    });
    return;
  }

  // Stream Uploaded Videos with HTTP Range Support (HTML5 Video seeking & fast buffer)
  if (pathname.startsWith('/api/uploads/') && (req.method === 'GET' || req.method === 'HEAD')) {
    const filename = path.basename(pathname.replace('/api/uploads/', '')).split('?')[0];
    let targetFile = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(targetFile)) {
      const fallbackFile = path.join(UPLOADS_DIR, 'sample_doorstep_proof.mp4');
      if (fs.existsSync(fallbackFile)) {
        targetFile = fallbackFile;
      }
    }

    if (fs.existsSync(targetFile)) {
      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'video/mp4';
      const stat = fs.statSync(targetFile);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });
        res.end();
        return;
      }

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`,
            'Access-Control-Allow-Origin': '*'
          });
          res.end();
          return;
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(targetFile, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        fileStream.pipe(res);
        return;
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(targetFile).pipe(res);
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Video file not found' }));
      return;
    }
  }

  // 4. Deliveries REST API
  if (pathname === '/api/deliveries' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(deliveries));
    return;
  }

  if (pathname === '/api/deliveries' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const newOrder = JSON.parse(body);
        if (!newOrder.id) {
          newOrder.id = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (!newOrder.createdAt) {
          newOrder.createdAt = new Date().toISOString();
        }

        const existingIndex = deliveries.findIndex((d) => d.id === newOrder.id);
        if (existingIndex >= 0) {
          deliveries[existingIndex] = { ...deliveries[existingIndex], ...newOrder };
        } else {
          deliveries.unshift(newOrder);
        }
        saveDeliveries();

        // Broadcast to mobile apps and admin tabs
        broadcastEvent({
          type: 'ORDER_DISPATCHED',
          deliveryId: newOrder.id,
          status: newOrder.status || 'IN_TRANSIT',
          notes: `New task dispatched: ${newOrder.id} to ${newOrder.customer?.name || 'Customer'}`,
          timestamp: new Date().toISOString(),
          extra: {
            order: newOrder
          }
        });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivery: newOrder }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // PUT /api/deliveries/:id
  if (pathname.startsWith('/api/deliveries/') && req.method === 'PUT') {
    const id = decodeURIComponent(pathname.replace('/api/deliveries/', ''));
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const order = deliveries.find((d) => d.id === id || d.trackingNumber === id);
        if (!order) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Delivery ${id} not found` }));
          return;
        }

        Object.assign(order, updates);
        saveDeliveries();

        // Determine event type
        const eventType = updates.assignedDriverId || updates.driver
          ? 'TASK_ASSIGNED'
          : updates.status === 'VERIFIED' || updates.status === 'REJECTED' || updates.adminApprovalStatus === 'APPROVED'
          ? 'ADMIN_DECISION_UPDATED'
          : 'ORDER_UPDATED';

        broadcastEvent({
          type: eventType,
          deliveryId: order.id,
          status: order.status,
          notes: updates.notes || `Task ${order.id} updated`,
          timestamp: new Date().toISOString(),
          extra: {
            ...updates,
            order
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivery: order }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 5. Health Check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), deliveriesCount: deliveries.length }));
    return;
  }

  // 6. Serve Admin Static Files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  // Security check: ensure file path remains inside admin directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexFile = path.join(__dirname, 'index.html');
      fs.readFile(indexFile, (err2, content) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err2, content) => {
      if (err2) {
        res.writeHead(500);
        res.end('Internal server error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SABOOT REAL-TIME ADMIN & SYNC SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${HOST}:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api/deliveries`);
  console.log(`  Events:  http://localhost:${PORT}/api/events (SSE)`);
  console.log(`======================================================\n`);
});
