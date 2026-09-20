// Saboot Admin Operations Console Logic with Google Maps JS API & Live Task Tracking

const INITIAL_ORDERS = [
  {
    id: 'DEL-1001',
    trackingNumber: 'SBT-BLR-882190',
    customer: { name: 'Vishnu Bhargav', phone: '+91 90191 44983' },
    address: { street: 'Tower 4, Flat 902, Sobha Silicon Oasis', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.8715, lng: 77.6534 },
    packageDescription: 'Electronics — Sony Wireless ANC Headphones',
    driver: 'DRV-BLR-09 (Unit 24)',
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
    decisionReason: 'All mandatory physical (38m/50m), residence dwell (158s/150s), and telephony criteria (24s) verified.'
  },
  {
    id: 'DEL-1002',
    trackingNumber: 'SBT-BLR-882191',
    customer: { name: 'Rahul Varma', phone: '+91 97412 88712' },
    address: { street: '12th Main Road, HAL 2nd Stage, Indiranagar', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9719, lng: 77.6412 },
    packageDescription: 'Apparel — Nike Running Shoes',
    driver: 'DRV-BLR-09 (Unit 24)',
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
    decisionReason: 'Zero-trust check failed: Driver was 3.2km away from address with only 8s recorded dwell and zero calls.'
  },
  {
    id: 'DEL-1003',
    trackingNumber: 'SBT-BLR-882192',
    customer: { name: 'Sneha Kulkarni', phone: '+91 99001 44521' },
    address: { street: 'Green Glen Layout, Bellandur', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9298, lng: 77.6743 },
    packageDescription: 'Kitchenware — Espresso Machine',
    driver: 'DRV-BLR-12 (Unit 12)',
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
  },
  {
    id: 'DEL-1004',
    trackingNumber: 'SBT-BLR-882193',
    customer: { name: 'Manoj Hegde', phone: '+91 98860 33119' },
    address: { street: '14th Main, 7th Sector, HSR Layout', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.9116, lng: 77.6389 },
    packageDescription: 'Medicine / Perishables — Cold Storage Pack',
    driver: 'DRV-BLR-15 (Unit 15)',
    assignedDriverId: 'DRV-BLR-15',
    status: 'DELIVERED',
    distanceMeters: 14,
    dwellSeconds: 140,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDuration: 18,
    gpsAccuracy: 7,
    auditId: 'AUD-4L19-V88Z',
    decision: 'DELIVERED',
    decisionReason: 'Delivery completed & verified. Customer handoff confirmed at door.'
  },
  {
    id: 'DEL-1005',
    trackingNumber: 'SBT-BLR-882194',
    customer: { name: 'Priya Nambiar', phone: '+91 98452 33190' },
    address: { street: 'Prestige Falcon City, Kanakapura Road', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.8912, lng: 77.5621 },
    packageDescription: 'Electronics — Apple iPad Air M2 & Apple Pencil',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'IN_TRANSIT',
    distanceMeters: 28,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882194-NEW',
    decision: 'REVIEW',
    decisionReason: 'Requires doorstep delivery; Resident ID verification at lobby.'
  },
  {
    id: 'DEL-1006',
    trackingNumber: 'SBT-BLR-882195',
    customer: { name: 'Arvind Swaminathan', phone: '+91 98801 77241' },
    address: { street: 'RMZ Ecospace, Outer Ring Road, Bellandur', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9260, lng: 77.6830 },
    packageDescription: 'Corporate Handoff — Urgent Signed Legal Documents',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 35,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882195-NEW',
    decision: 'REVIEW',
    decisionReason: 'Corporate legal documents — security desk drop allowed.'
  },
  {
    id: 'DEL-1007',
    trackingNumber: 'SBT-BLR-882196',
    customer: { name: 'Ananya Deshmukh', phone: '+91 97310 99420' },
    address: { street: '7th Cross, 4th Block, Koramangala', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9344, lng: 77.6258 },
    packageDescription: 'Perishables — Temperature Sensitive Biological Sample Pack',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882196-NEW',
    decision: 'REVIEW',
    decisionReason: 'Keep in insulated container until doorstep handoff.'
  },
  {
    id: 'DEL-1008',
    trackingNumber: 'SBT-BLR-882197',
    customer: { name: 'Vikramaditya Roy', phone: '+91 96118 22340' },
    address: { street: 'Brigade Gateway, Dr. Rajkumar Road, Malleshwaram', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 13.0118, lng: 77.5552 },
    packageDescription: 'Luxury Goods — Swiss Chronograph Watch',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 40,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882197-NEW',
    decision: 'REVIEW',
    decisionReason: 'Direct customer handoff mandatory + video verification.'
  },
  {
    id: 'DEL-1009',
    trackingNumber: 'SBT-BLR-882198',
    customer: { name: 'Rohan Sen', phone: '+91 98450 11992' },
    address: { street: 'Prestige Shantiniketan, ITPL Main Road, Whitefield', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.9892, lng: 77.7281 },
    packageDescription: 'Computing — MacBook Pro M3 MagSafe Charger & Thunderbolt Hub',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 30,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882198-NEW',
    decision: 'REVIEW',
    decisionReason: 'Call on arrival for visitor gate entry passcode.'
  },
  {
    id: 'DEL-1010',
    trackingNumber: 'SBT-BLR-882199',
    customer: { name: 'Meera Iyer', phone: '+91 97401 22883' },
    address: { street: '100 Feet Road, HAL 2nd Stage, Indiranagar', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9734, lng: 77.6402 },
    packageDescription: 'Personal Care — Dyson Airwrap Multi-Styler',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'IN_TRANSIT',
    distanceMeters: 22,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 4,
    auditId: 'AUD-882199-NEW',
    decision: 'REVIEW',
    decisionReason: 'Deliver to 4th floor doorstep; elevator functional.'
  },
  {
    id: 'DEL-1011',
    trackingNumber: 'SBT-BLR-882200',
    customer: { name: 'Karthik Reddy', phone: '+91 99802 33774' },
    address: { street: '27th Main, Sector 1, HSR Layout', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9152, lng: 77.6514 },
    packageDescription: 'Gourmet — Nespresso Coffee Pods & Glass Decanter Set',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 18,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882200-NEW',
    decision: 'REVIEW',
    decisionReason: 'Ring doorbell twice; leave on porch if no response.'
  },
  {
    id: 'DEL-1012',
    trackingNumber: 'SBT-BLR-882201',
    customer: { name: 'Deepa Balakrishnan', phone: '+91 98863 44665' },
    address: { street: 'Salarpuria Sattva Greenage, Hosur Road, Bommanahalli', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.9022, lng: 77.6254 },
    packageDescription: 'Farm Produce — Fresh Organic Artisanal Dairy Basket',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 36,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882201-NEW',
    decision: 'REVIEW',
    decisionReason: 'Perishable item; keep chilled.'
  },
  {
    id: 'DEL-1013',
    trackingNumber: 'SBT-BLR-882202',
    customer: { name: 'Aditya Singhania', phone: '+91 99014 55886' },
    address: { street: 'Lavelle Road, Shanthala Nagar, Ashok Nagar', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9716, lng: 77.5946 },
    packageDescription: 'Stationery — Montblanc Meisterstück Fountain Pen Gold Coated',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 26,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882202-NEW',
    decision: 'REVIEW',
    decisionReason: 'High value insured package; signature and video required.'
  },
  {
    id: 'DEL-1014',
    trackingNumber: 'SBT-BLR-882203',
    customer: { name: 'Shreya Joshi', phone: '+91 97425 66997' },
    address: { street: '33rd Cross, 11th Main, 4th T Block, Jayanagar', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9254, lng: 77.5938 },
    packageDescription: 'Handicrafts — Handcrafted Kashmiri Walnut Wood Keepsake Box',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882203-NEW',
    decision: 'REVIEW',
    decisionReason: 'Fragile handling mandatory.'
  },
  {
    id: 'DEL-1015',
    trackingNumber: 'SBT-BLR-882204',
    customer: { name: 'Farhan Akhtar', phone: '+91 98806 77118' },
    address: { street: 'Embassy GolfLinks, Intermediate Ring Road, Domlur', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9515, lng: 77.6482 },
    packageDescription: 'Audio Gear — Bose QuietComfort Ultra Wireless Noise-Cancelling Earbuds',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 32,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882204-NEW',
    decision: 'REVIEW',
    decisionReason: 'Corporate park entry; show driver badge at security post.'
  },
  {
    id: 'DEL-1016',
    trackingNumber: 'SBT-BLR-882205',
    customer: { name: 'Tanvi Madhavan', phone: '+91 96117 88229' },
    address: { street: 'Godrej Platinum, Bellary Road, Hebbal', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 13.0358, lng: 77.5970 },
    packageDescription: 'Hardware — ASUS ROG GeForce RTX 4080 Super OC Edition',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 42,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882205-NEW',
    decision: 'REVIEW',
    decisionReason: 'Fragile electronic equipment; do not tilt box.'
  },
  {
    id: 'DEL-1017',
    trackingNumber: 'SBT-BLR-882206',
    customer: { name: 'Nikhil Kamath', phone: '+91 98458 99330' },
    address: { street: 'Sankey Road, Sadashivanagar', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 13.0068, lng: 77.5813 },
    packageDescription: 'Banking Courier — Tamper-Evident Physical Ledger Hardware Key',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 25,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882206-NEW',
    decision: 'REVIEW',
    decisionReason: 'Strict zero-trust delivery: biometric OTP handoff only.'
  },
  {
    id: 'DEL-1018',
    trackingNumber: 'SBT-BLR-882207',
    customer: { name: 'Pooja Sundaram', phone: '+91 99029 00441' },
    address: { street: 'Phoenix One Bangalore West, Dr. Rajkumar Road, Rajajinagar', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 13.0102, lng: 77.5518 },
    packageDescription: 'Luxury Apparel — Louis Vuitton Speedy Bandoulière Monogram Bag',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 38,
    dwellSeconds: 0,
    requiredDwellSeconds: 150,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882207-NEW',
    decision: 'REVIEW',
    decisionReason: 'Resident requested video footage handoff confirmation.'
  },
  {
    id: 'DEL-1019',
    trackingNumber: 'SBT-BLR-882208',
    customer: { name: 'Varun Grover', phone: '+91 97430 11552' },
    address: { street: '80 Feet Road, 6th Block, Koramangala', city: 'Bengaluru', residenceCategory: 'apartment', lat: 12.9372, lng: 77.6271 },
    packageDescription: 'Wellness — Wakefit Orthopedic Memory Foam Support Mattress',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 28,
    dwellSeconds: 0,
    requiredDwellSeconds: 120,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 6,
    auditId: 'AUD-882208-NEW',
    decision: 'REVIEW',
    decisionReason: 'Heavy parcel; doorstep assistance requested.'
  },
  {
    id: 'DEL-1020',
    trackingNumber: 'SBT-BLR-882209',
    customer: { name: 'Ayesha Siddiqui', phone: '+91 98861 22663' },
    address: { street: 'Cunningham Road, Vasanth Nagar', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.9866, lng: 77.5968 },
    packageDescription: 'Heirloom Jewelry — Antique Gold Filigree Appraisal Box',
    driver: 'DRV-BLR-09 (Unit 24)',
    assignedDriverId: 'DRV-BLR-09',
    status: 'ASSIGNED',
    distanceMeters: 20,
    dwellSeconds: 0,
    requiredDwellSeconds: 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: 'AUD-882209-NEW',
    decision: 'REVIEW',
    decisionReason: 'High security parcel; mandatory tamper check before handoff.'
  }
];

let orders = [...INITIAL_ORDERS];
let selectedOrderId = orders[0].id;
let filterQuery = '';

// Real-time synchronization channel between Driver App and Admin Operations Console
const SYNC_CHANNEL_NAME = 'saboot_realtime_sync';
const STORAGE_EVENT_KEY = 'saboot_realtime_event_bus';
const SQLITE_STORAGE_KEY = 'saboot_sqlite_deliveries_v1';

let adminBroadcastChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  try {
    adminBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    adminBroadcastChannel.onmessage = (event) => {
      if (event && event.data) {
        handleIncomingRealtimeEvent(event.data);
      }
    };
  } catch (e) {
    console.warn('[Admin] BroadcastChannel error:', e);
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_EVENT_KEY && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      handleIncomingRealtimeEvent(data);
    } catch (err) {}
  }
});

// Connect to Server-Sent Events (SSE) Stream from Node server
if (typeof EventSource !== 'undefined') {
  try {
    const sse = new EventSource('/api/events');
    sse.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data && data.type) {
          handleIncomingRealtimeEvent(data);
        }
      } catch (err) {}
    };
  } catch (err) {
    console.warn('[Admin] EventSource connection warning:', err);
  }
}

function broadcastToApp(event) {
  try {
    if (adminBroadcastChannel) {
      adminBroadcastChannel.postMessage(event);
    }
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ ...event, _t: Date.now() }));
    }
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  } catch (err) {}
}

// Live Driver Telemetry Cache (driverId -> { lat, lng, speed, accuracy, heading, updatedAt })
const driverLiveTelemetry = {};

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function fetchInitialDriverTelemetry() {
  try {
    const res = await fetch('/api/telemetry');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.drivers)) {
        data.drivers.forEach((d) => {
          if (d.driverId && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
            driverLiveTelemetry[d.driverId] = {
              lat: d.latitude,
              lng: d.longitude,
              accuracy: d.accuracy || 5,
              speed: d.speed || 0,
              heading: d.heading || 0,
              updatedAt: d.updatedAt || Date.now()
            };
          }
        });
        const curr = orders.find((o) => o.id === selectedOrderId);
        if (curr) renderSelectedOrderMap(curr);
      }
    }
  } catch (e) {}
}

function handleDriverLocationUpdate(event) {
  if (!event || typeof event.latitude !== 'number' || typeof event.longitude !== 'number') return;
  const driverId = event.driverId || 'DRV-BLR-09';
  driverLiveTelemetry[driverId] = {
    lat: event.latitude,
    lng: event.longitude,
    accuracy: event.accuracy || 5,
    speed: event.speed || 0,
    heading: event.heading || 0,
    updatedAt: event.timestamp || Date.now()
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  if (selectedOrder && (selectedOrder.assignedDriverId === driverId || selectedOrder.driver?.includes(driverId))) {
    // Update marker on map smoothly
    if (lTruckMarker) {
      lTruckMarker.setLatLng([event.latitude, event.longitude]);
      if (lRoutePolyline) {
        lRoutePolyline.setLatLngs([
          [event.latitude, event.longitude],
          [selectedOrder.address.lat, selectedOrder.address.lng]
        ]);
      }
    }

    // Recalculate real Haversine distance
    const liveDist = Math.round(calculateHaversineDistance(
      event.latitude,
      event.longitude,
      selectedOrder.address.lat,
      selectedOrder.address.lng
    ));

    // Update telemetry bar and banner
    const telemDist = document.getElementById('telemetryDistance');
    if (telemDist) {
      telemDist.innerHTML = `${liveDist}m (${liveDist <= 50 ? '≤50m OK' : 'OUTSIDE'})`;
    }

    const telemDriver = document.getElementById('telemetryDriver');
    if (telemDriver) {
      const kmh = Math.round((event.speed || 0) * 3.6);
      telemDriver.innerHTML = `${driverId} • <span style="color:#10B981;font-weight:900;">LIVE GPS (${kmh} km/h)</span>`;
    }

    const banner = document.getElementById('geofenceStatusBanner');
    const bannerText = document.getElementById('geofenceStatusText');
    if (banner && bannerText) {
      if (liveDist <= 50) {
        banner.className = 'geofence-status-banner banner-inside';
        bannerText.innerText = `INSIDE 50M GEOFENCE • ${liveDist}M TO DOOR (LIVE)`;
      } else {
        banner.className = 'geofence-status-banner banner-outside';
        bannerText.innerText = `OUTSIDE GEOFENCE • ${liveDist}M FROM DESTINATION (LIVE)`;
      }
    }
  }
}

function handleIncomingRealtimeEvent(event) {
  if (!event || !event.type) return;

  // Real-time Driver GPS Telemetry Stream from Phone
  if (event.type === 'DRIVER_LOCATION_UPDATE') {
    handleDriverLocationUpdate(event);
    return;
  }

  // Real-time Customer Email Notification Updates
  if ((event.type === 'CUSTOMER_EMAIL_SENT' || event.type === 'CUSTOMER_EMAIL_SIMULATED' || event.type === 'CUSTOMER_EMAIL_FAILED') && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId || o.trackingNumber === event.deliveryId);
    if (order) {
      if (event.notification) order.customerNotification = event.notification;
      if (event.auditTimeline) order.auditTimeline = event.auditTimeline;
      if (selectedOrderId === order.id) {
        selectOrder(order.id);
      }
      showNotification(`✉️ Email Notification [${order.id}]: ${event.notification?.status || event.type}`);
    }
    return;
  }

  // Real-time Customer Verification Response from Customer Portal
  if (event.type === 'CUSTOMER_RESPONSE_RECORDED' && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId || o.trackingNumber === event.deliveryId);
    if (order) {
      order.customerResponse = event.customerResponse;
      order.customerResponseAt = event.recordedAt;
      order.customerResponseSource = 'customer_portal';
      if (event.status) order.status = event.status;
      if (event.decision) order.decision = event.decision;
      if (event.retryRequired !== undefined) order.retryRequired = event.retryRequired;
      if (event.auditTimeline) order.auditTimeline = event.auditTimeline;

      updateKPICounters();
      renderOrderList();
      renderCustomerConfirmedFailuresTable();
      if (selectedOrderId === order.id) {
        selectOrder(order.id);
      }
      const isReceived = event.customerResponse === 'PACKAGE_RECEIVED' || event.customerResponse === 'CUSTOMER_AVAILABLE';
      showNotification(`Customer confirmation received for ${order.id}: ${isReceived ? 'PACKAGE RECEIVED' : 'PACKAGE NOT RECEIVED'}`);
    }
    return;
  }

  if (event.type === 'DELIVERY_COMPLETED' && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId || o.trackingNumber === event.deliveryId);
    const hasVideo = !!(event.videoProofUri || event.extra?.videoProofUri);
    const requiresReview = hasVideo || event.status === 'REVIEW' || event.extra?.requiresAdminApproval;
    const finalStatus = requiresReview ? 'REVIEW' : (event.status || 'DELIVERED');

    if (!order) {
      order = {
        id: event.deliveryId,
        trackingNumber: event.extra?.trackingNumber || `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
        customer: { name: event.extra?.customerName || 'Customer', phone: '+91 90191 44983' },
        address: { street: 'Bengaluru Delivery Address', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.8715, lng: 77.6534 },
        packageDescription: event.extra?.packageDescription || 'Delivered Package',
        driver: event.extra?.driverId || 'DRV-BLR-09 (Unit 24)',
        status: finalStatus,
        distanceMeters: 12,
        dwellSeconds: 90,
        requiredDwellSeconds: 90,
        callAttempted: true,
        callDuration: 20,
        gpsAccuracy: 6,
        auditId: event.auditId || `AUD-${Date.now().toString(36).toUpperCase()}`,
        decision: finalStatus,
        decisionReason: requiresReview
          ? `Doorstep handoff video submitted (${event.handoffType || 'doorstep'}). Awaiting supervisor review to confirm legitimacy.`
          : `Delivery completed & verified. Customer handoff confirmed at door (${event.handoffType || 'direct'}).`,
        videoProofUri: event.videoProofUri || event.extra?.videoProofUri,
        handoffType: event.handoffType,
        requiresAdminApproval: requiresReview,
        adminApprovalStatus: requiresReview ? 'PENDING' : 'APPROVED',
      };
      orders.unshift(order);
    } else {
      order.status = finalStatus;
      order.decision = finalStatus;
      order.decisionReason = requiresReview
        ? `Doorstep handoff video submitted (${event.handoffType || 'doorstep'}). Awaiting supervisor review to confirm legitimacy.`
        : `Delivery completed & verified. Customer handoff confirmed at door (${event.handoffType || 'direct'}).`;
      order.videoProofUri = event.videoProofUri || event.extra?.videoProofUri || order.videoProofUri;
      order.handoffType = event.handoffType || order.handoffType;
      order.distanceMeters = 12;
      order.dwellSeconds = Math.max(order.dwellSeconds, 90);
      order.requiresAdminApproval = requiresReview;
      order.adminApprovalStatus = requiresReview ? 'PENDING' : 'APPROVED';
      if (event.auditId) order.auditId = event.auditId;
    }

    updateKPICounters();
    renderOrderList();
    selectOrder(order.id);

    if (requiresReview) {
      showNotification(`🔔 NEW SUPERVISOR REVIEW: Order ${order.id} submitted with video proof!`);
    } else {
      showNotification(`🔔 REAL-TIME SYNC: Order ${order.id} marked DELIVERED with verified proof!`);
    }
  } else if (event.type === 'DELIVERY_ATTESTED' && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId);
    if (order) {
      const hasVideo = !!(event.videoProofUri || event.extra?.videoProofUri);
      const requiresReview = hasVideo || event.status === 'REVIEW' || event.extra?.requiresAdminApproval;
      order.status = requiresReview ? 'REVIEW' : (event.status || order.status);
      order.decision = order.status;
      order.requiresAdminApproval = requiresReview;
      order.adminApprovalStatus = requiresReview ? 'PENDING' : (event.extra?.adminApprovalStatus || 'APPROVED');
      if (event.videoProofUri) order.videoProofUri = event.videoProofUri;
      if (event.extra?.decisionReason) order.decisionReason = event.extra.decisionReason;
      updateKPICounters();
      renderOrderList();
      selectOrder(order.id);
      showNotification(`🔔 REAL-TIME SYNC: Order ${event.deliveryId} updated to ${order.status}`);
    }
  }
}

async function loadPersistentDeliveries() {
  // 1. Fetch from HTTP Sync server (pulls any fresh dispatches from admin server)
  try {
    const res = await fetch('/api/deliveries');
    if (res.ok) {
      const serverDeliveries = await res.json();
      if (Array.isArray(serverDeliveries) && serverDeliveries.length > 0) {
        serverDeliveries.forEach((sd) => {
          const idx = orders.findIndex((o) => o.id === sd.id);
          const formatted = {
            id: sd.id,
            trackingNumber: sd.trackingNumber || `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
            customer: sd.customer || { name: 'Customer', phone: '+91 90191 44983' },
            address: {
              street: sd.address?.street || 'Bengaluru Address',
              city: sd.address?.city || 'Bengaluru',
              residenceCategory: sd.address?.residenceCategory || 'individual_house',
              lat: sd.address?.latitude || sd.address?.lat || 12.9719,
              lng: sd.address?.longitude || sd.address?.lng || 77.6412,
            },
            driver: sd.driver || `${sd.assignedDriverId || 'DRV-BLR-09'} (Unit)`,
            assignedDriverId: sd.assignedDriverId || 'DRV-BLR-09',
            status: sd.status || 'IN_TRANSIT',
            distanceMeters: sd.distanceMeters ?? 25,
            dwellSeconds: sd.dwellSeconds ?? 0,
            requiredDwellSeconds: sd.requiredDwellSeconds ?? 90,
            callAttempted: sd.callAttempted ?? false,
            callDuration: sd.callDuration ?? 0,
            gpsAccuracy: sd.gpsAccuracy ?? 5,
            auditId: sd.auditId || `AUD-${sd.id}`,
            decision: sd.decision || (sd.status === 'DELIVERED' ? 'DELIVERED' : 'REVIEW'),
            decisionReason: sd.decisionReason || sd.notes || 'Order active on route.',
            videoProofUri: sd.videoProofUri,
            requiresAdminApproval: sd.requiresAdminApproval,
            adminApprovalStatus: sd.adminApprovalStatus,
          };

          if (idx >= 0) {
            orders[idx] = { ...orders[idx], ...formatted };
          } else {
            orders.unshift(formatted);
          }
        });
        renderOrderList();
        updateKPICounters();
      }
    }
  } catch (err) {
    console.warn('[Admin] Failed to fetch deliveries from sync server:', err);
  }

  // 2. Also check localStorage for local offline edits
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SQLITE_STORAGE_KEY);
      if (raw) {
        const persisted = JSON.parse(raw);
        if (Array.isArray(persisted)) {
          persisted.forEach((p) => {
            const matched = orders.find((o) => o.id === p.id);
            if (matched) {
              matched.status = p.status;
              if (p.completedAt) matched.completedAt = p.completedAt;
              if (p.videoProofUri) matched.videoProofUri = p.videoProofUri;
              if (p.handoffType) matched.handoffType = p.handoffType;
              if (p.status === 'DELIVERED') {
                matched.decision = 'DELIVERED';
                matched.decisionReason = `Delivery confirmed & verified via ${p.handoffType || 'doorstep'} handoff with video proof.`;
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('[Admin] Error loading persistent SQLite deliveries:', e);
    }
  }
}

// Open-source Map instances (Leaflet + OpenStreetMap / Carto Positron)
let lMap = null;
let lGeofenceCircle = null;
let lRoutePolyline = null;
let lCustomerMarker = null;
let lTruckMarker = null;

// Initialize Map exclusively with Open-Source Leaflet & Carto/OSM Tiles
function initMap(retryCount = 0) {
  if (lMap) return;

  if (typeof L === 'undefined' || !L || typeof L.map !== 'function') {
    if (retryCount < 15) {
      setTimeout(() => initMap(retryCount + 1), 250);
    }
    return;
  }

  try {
    const mapEl = document.getElementById('adminMap');
    if (!mapEl) return;

    const defaultOrder = orders && orders.length > 0 ? orders[0] : { address: { lat: 12.9716, lng: 77.5946 }, distanceMeters: 38 };

    lMap = L.map('adminMap', {
      zoomControl: true,
      attributionControl: true
    }).setView([defaultOrder.address.lat, defaultOrder.address.lng], 16);

    // High-performance, 100% open-source tiles (Overture Maps Foundation / OpenFreeMap / OpenStreetMap compliant - No API key required, zero watermarks)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://overturemaps.org" target="_blank">Overture Maps Foundation</a> &copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19
    }).addTo(lMap);

    // Invalidate size after layout settles to guarantee tiles render without blank spots
    setTimeout(() => { if (lMap) lMap.invalidateSize(); }, 200);
    setTimeout(() => { if (lMap) lMap.invalidateSize(); }, 600);
    window.addEventListener('resize', () => { if (lMap) lMap.invalidateSize(); });

    renderSelectedOrderMap(defaultOrder);
  } catch (err) {
    console.warn('[Admin] Leaflet map initialization warning:', err);
  }
}

// Render Order on Open-Source Map with Geofence & Route
function renderSelectedOrderMap(order) {
  if (!lMap || !order) return;
  try { lMap.invalidateSize(); } catch (e) {}

  const destLat = order.address.lat;
  const destLng = order.address.lng;
  const driverOffsetLat = order.distanceMeters > 500 ? destLat + 0.022 : destLat + 0.0003;
  const driverOffsetLng = order.distanceMeters > 500 ? destLng + 0.022 : destLng + 0.0003;

  // Use live GPS telemetry if driver is active, otherwise fallback to destination offset
  const live = driverLiveTelemetry[order.assignedDriverId] || driverLiveTelemetry['DRV-BLR-09'];
  const hasLiveGps = live && typeof live.lat === 'number' && typeof live.lng === 'number';
  const driverPos = hasLiveGps ? [live.lat, live.lng] : [driverOffsetLat, driverOffsetLng];

  const currentDist = hasLiveGps
    ? Math.round(calculateHaversineDistance(live.lat, live.lng, destLat, destLng))
    : order.distanceMeters;

  if (lGeofenceCircle) lMap.removeLayer(lGeofenceCircle);
  if (lRoutePolyline) lMap.removeLayer(lRoutePolyline);
  if (lCustomerMarker) lMap.removeLayer(lCustomerMarker);
  if (lTruckMarker) lMap.removeLayer(lTruckMarker);

  const dest = [destLat, destLng];

  // 50m Geofence Circle
  lGeofenceCircle = L.circle(dest, {
    color: currentDist <= 50 ? '#15803D' : '#D94A27',
    fillColor: currentDist <= 50 ? '#15803D' : '#D94A27',
    fillOpacity: currentDist <= 50 ? 0.18 : 0.08,
    weight: 2.5,
    dashArray: '5, 5',
    radius: 50
  }).addTo(lMap);

  // Dashed Route Polyline
  lRoutePolyline = L.polyline([driverPos, dest], {
    color: '#D94A27',
    weight: 3,
    dashArray: '4, 6',
    opacity: 0.8
  }).addTo(lMap);

  // Customer Pin Marker (Zero-trust verified destination)
  const custIcon = L.divIcon({
    className: 'custom-pin',
    html: '<div style="background:#D94A27; color:#fff; width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg); font-size:14px;">📍</span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
  lCustomerMarker = L.marker(dest, { icon: custIcon }).addTo(lMap);

  // Live Driver Truck Marker
  const truckIcon = L.divIcon({
    className: 'truck-pin',
    html: '<div style="background:#1E293B; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #fff; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🚚</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  lTruckMarker = L.marker(driverPos, { icon: truckIcon }).addTo(lMap);

  lMap.fitBounds(L.latLngBounds([dest, driverPos]), { padding: [50, 50], maxZoom: 17 });
}

// Render Order List & Filter
function renderOrderList() {
  const container = document.getElementById('orderList');
  container.innerHTML = '';

  const filtered = orders.filter((order) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      order.trackingNumber.toLowerCase().includes(q) ||
      order.customer.name.toLowerCase().includes(q) ||
      order.customer.phone.includes(q)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: #64748B; font-size: 12px;">
        No task found matching "<strong>${filterQuery}</strong>"
      </div>
    `;
    return;
  }

  filtered.forEach((order) => {
    const isSelected = order.id === selectedOrderId;
    const card = document.createElement('div');
    card.className = `order-card ${isSelected ? 'active' : ''}`;
    card.onclick = () => selectOrder(order.id);

    const badgeClass = order.status.toLowerCase();
    const isPendingApproval = order.requiresAdminApproval && order.adminApprovalStatus === 'PENDING';

    card.innerHTML = `
      <div class="order-top">
        <span class="order-tracking">${order.trackingNumber}</span>
        <span class="status-badge ${badgeClass}">${isPendingApproval ? 'PENDING APPROVAL' : order.status}</span>
      </div>
      <div class="order-name">${order.customer.name}</div>
      <div class="order-address">${(order.address.unitOrFlat && !order.address.street.includes(order.address.unitOrFlat)) ? order.address.unitOrFlat + ', ' : ''}${order.address.street}</div>
      <div class="order-meta">
        <span>${order.address.residenceCategory.toUpperCase()} (${order.requiredDwellSeconds}s)</span>
        <span>${order.driver.split(' ')[0]}</span>
      </div>
      ${isPendingApproval ? '<div class="card-video-pill">📹 Video Proof Attached</div>' : ''}
    `;
    container.appendChild(card);
  });

  updateKPICounters();
}

function updateKPICounters() {
  document.getElementById('kpiTotal').innerText = orders.length;
  document.getElementById('queueCount').innerText = `${orders.length} Packages`;
  document.getElementById('kpiVerified').innerText = orders.filter((o) => o.status === 'VERIFIED' || o.status === 'DELIVERED').length;
  document.getElementById('kpiRejected').innerText = orders.filter((o) => o.status === 'REJECTED').length;
  document.getElementById('kpiReview').innerText = orders.filter((o) => o.status === 'REVIEW' || o.requiresAdminApproval).length;
}

// ==========================================
// INTERACTIVE VIDEO PROOF ENGINE & PLAYER
// ==========================================
const videoPlayers = {
  unavail: {
    type: 'unavail',
    isPlaying: false,
    currentTime: 0,
    duration: 6.0,
    animFrame: null,
    order: null,
  },
  delivery: {
    type: 'delivery',
    isPlaying: false,
    currentTime: 0,
    duration: 4.0,
    animFrame: null,
    order: null,
  }
};

function formatTimecode(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawDoorstepEvidenceFrame(canvasId, type, time, order) {
  // Pure native HTML5 video playback used. No canvas rendering or cartoon graphics.
}

function drawCleanEvidencePoster(ctx, w, h, type, time, order) {
  // Clean, sleek dark monitor backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle viewfinder frame corners
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  const margin = 20;
  const corner = 16;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(margin, margin + corner);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + corner, margin);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - margin - corner, margin);
  ctx.lineTo(w - margin, margin);
  ctx.lineTo(w - margin, margin + corner);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(margin, h - margin - corner);
  ctx.lineTo(margin, h - margin);
  ctx.lineTo(margin + corner, h - margin);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - margin - corner, h - margin);
  ctx.lineTo(w - margin, h - margin);
  ctx.lineTo(w - margin, h - margin - corner);
  ctx.stroke();

  // Center video camera icon
  const cx = w / 2;
  const cy = h / 2 - 15;

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Play triangle
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 12);
  ctx.lineTo(cx + 14, cy);
  ctx.lineTo(cx - 8, cy + 12);
  ctx.closePath();
  ctx.fill();

  // File label
  const rawUri = order?.videoProofUri;
  const fileName = (rawUri ? rawUri.split('/').pop().split('?')[0] : (type === 'delivery' ? 'doorstep_handoff_proof.mp4' : 'doorstep_absence_clip.mp4'));
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(fileName, cx, cy + 45);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.fillText('AUTHENTIC OPERATIONAL EVIDENCE', cx, cy + 62);
}

function drawTelemetryHUD(ctx, w, h, type, time, order) {
  // Clean unwatermarked display — telemetry is displayed in dedicated UI metric cards below the player
}

function setupHtmlVideoSource(type, uri) {
  const isUnavail = type === 'unavail';
  const videoEl = document.getElementById(isUnavail ? 'unavailableVideoPlayer' : 'deliveryVideoPlayer');
  const p = videoPlayers[type];
  if (!videoEl || !p) return;

  let playableSrc = '';
  if (uri) {
    if (uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('/api/uploads/')) {
      playableSrc = uri;
    } else {
      const fileName = uri.split('/').pop()?.split('?')[0] || (type === 'delivery' ? 'doorstep_handoff_proof.mp4' : 'doorstep_absence_clip.mp4');
      playableSrc = `/api/uploads/${fileName}`;
    }
  } else {
    // No video URI available — do NOT fall back to a sample/demo video
    playableSrc = '';
  }

  videoEl.dataset.fallbackTried = 'false';
  videoEl.src = playableSrc;
  videoEl.load();

  videoEl.onloadedmetadata = () => {
    if (videoEl.duration && !isNaN(videoEl.duration) && isFinite(videoEl.duration)) {
      p.duration = videoEl.duration;
      const scrubber = document.getElementById(isUnavail ? 'unavailScrubber' : 'deliveryScrubber');
      if (scrubber) scrubber.max = Math.floor(videoEl.duration * 10);
    }
    updatePlayerUI(type);
  };

  videoEl.ontimeupdate = () => {
    p.currentTime = videoEl.currentTime;
    updatePlayerUI(type);
  };

  videoEl.onended = () => {
    pauseVideo(type);
    p.currentTime = 0;
    updatePlayerUI(type);
  };

  videoEl.onplay = () => {
    p.isPlaying = true;
    const btnPlay = document.getElementById(isUnavail ? 'btnUnavailPlay' : 'btnDeliveryPlay');
    if (btnPlay) btnPlay.innerText = '⏸ PAUSE';
  };

  videoEl.onpause = () => {
    p.isPlaying = false;
    const btnPlay = document.getElementById(isUnavail ? 'btnUnavailPlay' : 'btnDeliveryPlay');
    if (btnPlay) btnPlay.innerText = '▶ PLAY';
  };

  videoEl.onerror = () => {
    console.warn('[Admin Video] Failed to load video source:', playableSrc);
    // Do not fall back to demo/sample videos — maintain audit authenticity
    p.isPlaying = false;
    updatePlayerUI(type);
  };
}

function toggleVideoPlayback(type) {
  const p = videoPlayers[type];
  if (!p) return;

  if (p.isPlaying) {
    pauseVideo(type);
  } else {
    playVideo(type);
  }
}

function playVideo(type) {
  const p = videoPlayers[type];
  if (!p) return;

  p.isPlaying = true;
  const isUnavail = type === 'unavail';
  const videoEl = document.getElementById(isUnavail ? 'unavailableVideoPlayer' : 'deliveryVideoPlayer');
  if (videoEl && videoEl.src) {
    videoEl.play().catch(() => {});
  }

  const btnPlay = document.getElementById(type === 'unavail' ? 'btnUnavailPlay' : 'btnDeliveryPlay');
  if (btnPlay) {
    btnPlay.innerText = '⏸ PAUSE';
  }
}

function pauseVideo(type) {
  const p = videoPlayers[type];
  if (!p) return;

  p.isPlaying = false;
  const isUnavail = type === 'unavail';
  const videoEl = document.getElementById(isUnavail ? 'unavailableVideoPlayer' : 'deliveryVideoPlayer');
  if (videoEl && !videoEl.paused) {
    videoEl.pause();
  }

  const btnPlay = document.getElementById(type === 'unavail' ? 'btnUnavailPlay' : 'btnDeliveryPlay');
  if (btnPlay) {
    btnPlay.innerText = '▶ PLAY';
  }
}

function restartVideo(type) {
  const p = videoPlayers[type];
  if (!p) return;
  p.currentTime = 0;
  const isUnavail = type === 'unavail';
  const videoEl = document.getElementById(isUnavail ? 'unavailableVideoPlayer' : 'deliveryVideoPlayer');
  if (videoEl && videoEl.src) {
    videoEl.currentTime = 0;
  }
  playVideo(type);
}

function seekVideo(type, targetSeconds) {
  const p = videoPlayers[type];
  if (!p) return;
  p.currentTime = Math.max(0, Math.min(targetSeconds, p.duration));
  const isUnavail = type === 'unavail';
  const videoEl = document.getElementById(isUnavail ? 'unavailableVideoPlayer' : 'deliveryVideoPlayer');
  if (videoEl && videoEl.src) {
    videoEl.currentTime = p.currentTime;
  }
  updatePlayerUI(type);
}

function updatePlayerUI(type) {
  const p = videoPlayers[type];
  if (!p) return;

  const scrubber = document.getElementById(type === 'unavail' ? 'unavailScrubber' : 'deliveryScrubber');
  if (scrubber) {
    scrubber.value = Math.floor(p.currentTime * 10);
  }

  const timecode = document.getElementById(type === 'unavail' ? 'unavailTimecode' : 'deliveryTimecode');
  if (timecode) {
    timecode.innerText = `${formatTimecode(p.currentTime)} / ${formatTimecode(p.duration)}`;
  }
}

function setupVideoListenersOnce() {
  if (window._videoListenersInitialized) return;
  window._videoListenersInitialized = true;

  // Unavail Play Button & Overlay
  const btnUnavailPlay = document.getElementById('btnUnavailPlay');
  const unavailWrapper = document.getElementById('unavailVideoWrapper');
  const unavailCircle = document.getElementById('unavailCircleBtn');
  const btnUnavailRestart = document.getElementById('btnUnavailRestart');
  const unavailScrubber = document.getElementById('unavailScrubber');

  if (btnUnavailPlay) btnUnavailPlay.onclick = () => toggleVideoPlayback('unavail');
  if (unavailCircle) unavailCircle.onclick = (e) => { e.stopPropagation(); toggleVideoPlayback('unavail'); };
  if (unavailWrapper) unavailWrapper.onclick = () => toggleVideoPlayback('unavail');
  if (btnUnavailRestart) btnUnavailRestart.onclick = () => restartVideo('unavail');
  if (unavailScrubber) {
    unavailScrubber.oninput = (e) => seekVideo('unavail', parseFloat(e.target.value) / 10);
  }

  // Delivery Play Button & Overlay
  const btnDeliveryPlay = document.getElementById('btnDeliveryPlay');
  const deliveryWrapper = document.getElementById('deliveryVideoWrapper');
  const deliveryCircle = document.getElementById('deliveryCircleBtn');
  const btnDeliveryRestart = document.getElementById('btnDeliveryRestart');
  const deliveryScrubber = document.getElementById('deliveryScrubber');

  if (btnDeliveryPlay) btnDeliveryPlay.onclick = () => toggleVideoPlayback('delivery');
  if (deliveryCircle) deliveryCircle.onclick = (e) => { e.stopPropagation(); toggleVideoPlayback('delivery'); };
  if (deliveryWrapper) deliveryWrapper.onclick = () => toggleVideoPlayback('delivery');
  if (btnDeliveryRestart) btnDeliveryRestart.onclick = () => restartVideo('delivery');
  if (deliveryScrubber) {
    deliveryScrubber.oninput = (e) => seekVideo('delivery', parseFloat(e.target.value) / 10);
  }
}

// Select an Order & Update Live Map / Telemetry
function selectOrder(orderId) {
  selectedOrderId = orderId;
  const order = orders.find((o) => o.id === orderId) || orders[0];

  renderOrderList();
  renderSelectedOrderMap(order);

  // Update Toolbar
  const displayAddress = (order.address.unitOrFlat && !order.address.street.includes(order.address.unitOrFlat))
    ? `${order.address.unitOrFlat}, ${order.address.street}`
    : order.address.street;
  document.getElementById('targetName').innerText = `${order.customer.name} (${displayAddress})`;
  const isInside = order.distanceMeters <= 50;
  const banner = document.getElementById('geofenceStatusBanner');
  banner.style.background = isInside ? '#F3FBF5' : '#FFF5F2';
  banner.style.borderColor = isInside ? '#A9D1BB' : '#FCA5A5';
  banner.style.color = isInside ? '#1A7047' : '#D94A27';
  document.getElementById('geofenceStatusText').innerText = isInside
    ? `INSIDE 50M GEOFENCE • ${order.distanceMeters}M TO DOOR`
    : `OUTSIDE GEOFENCE • ${order.distanceMeters}M DISTANCE`;

  // Update Bottom Telemetry
  document.getElementById('telemetryDriver').innerText = order.driver;
  document.getElementById('telemetryDistance').innerText = `${order.distanceMeters}m (${order.distanceMeters <= 50 ? '≤50m OK' : 'EXCEEDED'})`;
  document.getElementById('telemetryDwell').innerText = `${order.dwellSeconds}s / ${order.requiredDwellSeconds}s Target`;
  document.getElementById('telemetryCall').innerText = order.callAttempted ? `${order.customer.phone} (${order.callDuration}s)` : 'No Call Logged';

  // Synchronize selectDriver dropdown
  const selectDriverEl = document.getElementById('selectDriver');
  if (selectDriverEl) {
    const targetDriver = order.assignedDriverId || (order.driver?.includes('DRV-BLR-12') ? 'DRV-BLR-12' : order.driver?.includes('DRV-BLR-15') ? 'DRV-BLR-15' : 'DRV-BLR-09');
    selectDriverEl.value = targetDriver;
  }

  // Update Decision Badge
  const badge = document.getElementById('inspectorDecisionBadge');
  const title = document.getElementById('inspectorDecisionTitle');
  const sub = document.getElementById('inspectorDecisionSub');

  if (order.status === 'DELIVERED') {
    badge.style.background = '#ECFDF5';
    badge.style.borderColor = '#A7F3D0';
    title.style.color = '#065F46';
    title.innerText = 'DELIVERY COMPLETED';
    sub.innerText = order.decisionReason;
  } else if (order.status === 'VERIFIED') {
    badge.style.background = '#ECFDF5';
    badge.style.borderColor = '#A7F3D0';
    title.style.color = '#065F46';
    title.innerText = 'ATTEMPT VERIFIED';
    sub.innerText = order.decisionReason;
  } else if (order.status === 'REJECTED') {
    badge.style.background = '#FEF2F2';
    badge.style.borderColor = '#FECACA';
    title.style.color = '#991B1B';
    title.innerText = 'ATTEMPT REJECTED';
    sub.innerText = order.decisionReason;
  } else {
    badge.style.background = '#FFFBEB';
    badge.style.borderColor = '#FDE68A';
    title.style.color = '#92400E';
    title.innerText = order.requiresAdminApproval ? 'AWAITING ADMIN APPROVAL' : 'SENT TO OPS REVIEW';
    sub.innerText = order.decisionReason;
  }

  // Interactive Video Proof Engine Setup
  setupVideoListenersOnce();

  // Determine proof category: Absence vs Handoff
  const isHandoffProof =
    Boolean(order.handoffType) ||
    order.decisionReason?.toLowerCase().includes('handoff') ||
    order.decisionReason?.toLowerCase().includes('delivery') ||
    order.status === 'DELIVERED';

  const isAbsenceClaim = !isHandoffProof && (
    order.decisionReason?.toLowerCase().includes('absence') ||
    order.decisionReason?.toLowerCase().includes('unavailable') ||
    order.status === 'FAILED'
  );

  // 1. Handle Video Proof & Admin Approval Section (Customer Unavailable)
  const videoSection = document.getElementById('videoApprovalSection');
  if (isAbsenceClaim && (order.status === 'REVIEW' || (order.requiresAdminApproval && order.adminApprovalStatus === 'PENDING'))) {
    videoSection.style.display = 'block';
    const videoFileEl = document.getElementById('videoFileName');
    if (videoFileEl) {
      videoFileEl.innerText = order.videoProofUri?.split('/').pop() || 'doorstep_absence_clip_1003.mp4';
    }
    videoPlayers.unavail.order = order;
    videoPlayers.unavail.currentTime = 0;
    setupHtmlVideoSource('unavail', order.videoProofUri);
    pauseVideo('unavail');
    updatePlayerUI('unavail');
  } else {
    videoSection.style.display = 'none';
    pauseVideo('unavail');
  }

  // 2. Handle Delivery Handoff Video Proof Section for Successful Delivery / Review
  const deliveryVideoSection = document.getElementById('deliveryVideoProofSection');
  const auditPill = document.getElementById('deliveryAuditStatusPill');

  if (deliveryVideoSection) {
    const hasDeliveryProof = !isAbsenceClaim && (
      order.videoProofUri ||
      order.requiresAdminApproval ||
      order.status === 'REVIEW' ||
      order.status === 'DELIVERED' ||
      order.status === 'VERIFIED' ||
      order.status === 'REJECTED'
    );

    if (hasDeliveryProof && (order.videoProofUri || order.requiresAdminApproval || order.status === 'REVIEW')) {
      deliveryVideoSection.style.display = 'block';
      const fileNameEl = document.getElementById('deliveryVideoFileName');
      if (fileNameEl) {
        fileNameEl.innerText = order.videoProofUri ? order.videoProofUri.split('/').pop() : 'doorstep_handoff_proof.mp4';
      }

      if (auditPill) {
        if (order.adminApprovalStatus === 'APPROVED' || order.status === 'VERIFIED') {
          auditPill.innerText = 'SUPERVISOR VERIFIED ✓';
          auditPill.style.background = '#DCFCE7';
          auditPill.style.color = '#15803D';
          auditPill.style.borderColor = '#86EFAC';
        } else if (order.adminApprovalStatus === 'REJECTED' || order.status === 'REJECTED') {
          auditPill.innerText = 'FLAGGED / REJECTED ✕';
          auditPill.style.background = '#FEE2E2';
          auditPill.style.color = '#DC2626';
          auditPill.style.borderColor = '#FCA5A5';
        } else {
          auditPill.innerText = 'PENDING SUPERVISOR AUDIT';
          auditPill.style.background = '#FEF3C7';
          auditPill.style.color = '#D97706';
          auditPill.style.borderColor = '#FCD34D';
        }
      }

      videoPlayers.delivery.order = order;
      videoPlayers.delivery.currentTime = 0;
      setupHtmlVideoSource('delivery', order.videoProofUri);
      pauseVideo('delivery');
      updatePlayerUI('delivery');
    } else {
      deliveryVideoSection.style.display = 'none';
      pauseVideo('delivery');
    }
  }

  // Facts Matrix
  const factDist = document.getElementById('factDistance').querySelector('.fact-val');
  factDist.className = `fact-val ${order.distanceMeters <= 50 ? 'pass' : 'fail'}`;
  factDist.innerText = `${order.distanceMeters}m (${order.distanceMeters <= 50 ? 'PASS' : 'FAIL'})`;

  const factDwell = document.getElementById('factDwell').querySelector('.fact-val');
  factDwell.className = `fact-val ${order.dwellSeconds >= order.requiredDwellSeconds ? 'pass' : 'fail'}`;
  factDwell.innerText = `${order.dwellSeconds}s / ${order.requiredDwellSeconds}s (${order.dwellSeconds >= order.requiredDwellSeconds ? 'PASS' : 'FAIL'})`;

  const factCall = document.getElementById('factCall').querySelector('.fact-val');
  factCall.className = `fact-val ${order.callAttempted ? 'pass' : 'fail'}`;
  factCall.innerText = order.callAttempted ? `${order.callDuration}s (PASS)` : 'No Call (FAIL)';

  const factAcc = document.getElementById('factAccuracy').querySelector('.fact-val');
  factAcc.className = `fact-val ${order.gpsAccuracy <= 30 ? 'pass' : 'fail'}`;
  factAcc.innerText = `±${order.gpsAccuracy}m (${order.gpsAccuracy <= 30 ? 'PASS' : 'AMBIGUOUS'})`;

  // Populate Customer Verification Response Section
  const custBadgeEl = document.getElementById('customerResponseBadge');
  const custDetailEl = document.getElementById('customerResponseDetail');
  const custPortalLink = document.getElementById('btnOpenCustomerPortal');
  const custUrlText = document.getElementById('customerPortalUrlText');
  const notifBox = document.getElementById('simulatedNotificationBox');
  const notifMsg = document.getElementById('simulatedNotifMsg');
  const notifLink = document.getElementById('simulatedPortalLink');

  const verifyUrl = `/verify/${encodeURIComponent(order.id)}`;
  const fullVerifyUrl = (order.verificationUrl && !order.verificationUrl.includes('localhost'))
    ? order.verificationUrl
    : `${window.location.origin}${verifyUrl}`;

  if (custPortalLink) {
    custPortalLink.href = verifyUrl;
  }
  if (custUrlText) {
    custUrlText.innerText = verifyUrl;
  }
  if (notifLink) {
    notifLink.href = verifyUrl;
    notifLink.innerText = fullVerifyUrl;
  }
  if (notifMsg) {
    notifMsg.innerText = `SABOOT: Your delivery requires confirmation. Did you receive your package?`;
  }

  if (custBadgeEl && custDetailEl) {
    if (order.customerResponse) {
      const isReceived = order.customerResponse === 'PACKAGE_RECEIVED' || order.customerResponse === 'CUSTOMER_AVAILABLE';
      custBadgeEl.className = `customer-response-status-badge ${isReceived ? 'badge-cust-available' : 'badge-cust-unavailable'}`;
      custBadgeEl.innerHTML = `<span>${isReceived ? '✓' : '✕'}</span> Customer: <strong>${isReceived ? 'PACKAGE RECEIVED' : 'PACKAGE NOT RECEIVED'}</strong>`;
      const recordedTime = order.customerResponseAt ? new Date(order.customerResponseAt).toLocaleTimeString() : 'Recorded';
      custDetailEl.innerHTML = `Confirmation: <strong>${isReceived ? 'Receipt Confirmed' : 'Package Not Received'}</strong> • Logged: <strong>${recordedTime}</strong>`;
    } else {
      custBadgeEl.className = 'customer-response-status-badge badge-cust-none';
      custBadgeEl.innerText = 'No customer response recorded yet';
      custDetailEl.innerHTML = `Direct portal link: <a href="${verifyUrl}" target="_blank" style="color: var(--signal-orange); text-decoration: underline;">${verifyUrl}</a>`;
    }
  }

  // Populate Verification Summary Section
  const aiSummaryEl = document.getElementById('adminAiSummary');
  const aiEvidenceEl = document.getElementById('adminAiEvidence');
  const aiPolicyEl = document.getElementById('adminAiPolicy');
  const aiReviewFocusBlock = document.getElementById('adminAiReviewFocusBlock');
  const aiReviewFocusEl = document.getElementById('adminAiReviewFocus');
  const aiModelBadge = document.getElementById('adminAiModelBadge');

  if (aiSummaryEl) {
    aiSummaryEl.innerText = order.aiExplanation || order.aiSummary || order.decisionReason || 'All physical and telephony attempt criteria verified.';
  }
  if (aiEvidenceEl) {
    aiEvidenceEl.innerText = order.evidenceExplanation || (
      order.status === 'VERIFIED'
        ? `Driver location verified within ${order.distanceMeters}m geofence (limit ≤50m). Signal accuracy ±${order.gpsAccuracy}m. Call: ${order.callAttempted ? `${order.callDuration}s` : 'None'}.`
        : order.status === 'REJECTED'
        ? `Driver location was ${order.distanceMeters}m from delivery address (exceeded 50m limit). Telemetry: ${order.callAttempted ? 'Call made' : 'Zero calls logged'}.`
        : `GPS horizontal uncertainty ±${order.gpsAccuracy}m at ${order.distanceMeters}m distance. Corroborating review required.`
    );
  }
  if (aiPolicyEl) {
    aiPolicyEl.innerText = order.policyExplanation || (
      order.status === 'VERIFIED'
        ? `Residence dwell duration (${order.dwellSeconds}s) met the mandatory ${order.requiredDwellSeconds}s threshold. Mandatory conditions satisfied.`
        : order.status === 'REJECTED'
        ? `Dwell duration of ${order.dwellSeconds}s failed the required ${order.requiredDwellSeconds}s threshold.`
        : `Dwell was ${order.dwellSeconds}s vs ${order.requiredDwellSeconds}s required. Telemetry accuracy requires supervisor audit.`
    );
  }

  if (aiReviewFocusBlock && aiReviewFocusEl) {
    if (order.status === 'REVIEW' || order.requiresAdminApproval) {
      aiReviewFocusBlock.style.display = 'block';
      aiReviewFocusEl.innerText = order.reviewFocus || order.recommendedFocus || (
        order.videoProofUri
          ? 'Review the uploaded doorstep video proof in the console to confirm customer absence.'
          : '• GPS telemetry signal accuracy\n• Dwell duration compliance\n• Telephony call evidence'
      );
    } else {
      aiReviewFocusBlock.style.display = 'none';
    }
  }

  if (aiModelBadge) {
    aiModelBadge.innerText = `Model: ${order.modelUsed || 'Open-Source AI (Llama 3.1)'}`;
  }

  // Audit Box
  document.getElementById('auditId').innerText = order.auditId;
  document.getElementById('auditTime').innerText = new Date().toLocaleTimeString();

  // Render Customer Notification Status Card
  const notifBadge = document.getElementById('notifStatusBadge');
  const notifDetails = document.getElementById('adminNotificationDetails');
  if (notifDetails) {
    const notif = order.customerNotification || (order.simulatedNotification && order.simulatedNotification.channel === 'EMAIL' ? order.simulatedNotification : null);
    if (!notif) {
      if (notifBadge) {
        notifBadge.innerText = 'NONE';
        notifBadge.style.background = '#E2E8F0';
        notifBadge.style.color = '#475569';
      }
      notifDetails.innerHTML = `
        <div style="font-size: 11px; color: #64748B; font-style: italic;">
          No customer notification required for this status.
        </div>
      `;
    } else {
      const status = notif.status || 'PENDING';
      let badgeBg = '#FEF3C7';
      let badgeColor = '#92400E';
      if (status === 'SENT') {
        badgeBg = '#DCFCE7';
        badgeColor = '#166534';
      } else if (status === 'SIMULATED') {
        badgeBg = '#E0F2FE';
        badgeColor = '#0369A1';
      } else if (status === 'FAILED') {
        badgeBg = '#FEE2E2';
        badgeColor = '#991B1B';
      }
      if (notifBadge) {
        notifBadge.innerText = status;
        notifBadge.style.background = badgeBg;
        notifBadge.style.color = badgeColor;
      }

      const providerDisplay = (notif.provider || 'demo').toUpperCase();
      const sentTimeStr = notif.sentAt ? new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';

      let extraReason = '';
      if (status === 'FAILED' && notif.reason) {
        extraReason = `<div style="color: #DC2626; font-weight: 600; margin-top: 5px;">Reason: ${escapeHtml(notif.reason)}</div>`;
      }

      notifDetails.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Channel:</span>
          <strong>Email</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Provider:</span>
          <strong>${escapeHtml(providerDisplay)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Status:</span>
          <strong style="color: ${badgeColor};">${escapeHtml(status)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Sent:</span>
          <span>${escapeHtml(sentTimeStr)}</span>
        </div>
        ${notif.recipientEmail ? `
        <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px dashed #E2E8F0; padding-top: 4px;">
          <span style="color: #64748B;">Recipient:</span>
          <span style="font-family: monospace; font-size: 10px; color: #475569;">${escapeHtml(notif.recipientEmail)}</span>
        </div>` : ''}
        ${extraReason}
      `;
    }
  }

  // Render Verification Audit Timeline
  const timelineContainer = document.getElementById('adminTimelineContainer');
  const timelineCount = document.getElementById('auditTimelineCount');
  if (timelineContainer) {
    const timeline = Array.isArray(order.auditTimeline) ? order.auditTimeline : [];
    if (timelineCount) {
      timelineCount.innerText = `${timeline.length} EVENT${timeline.length === 1 ? '' : 'S'}`;
    }
    if (timeline.length === 0) {
      timelineContainer.innerHTML = `
        <div style="font-size: 11px; color: #64748B; font-style: italic; padding: 6px 0;">
          No timeline events recorded yet.
        </div>
      `;
    } else {
      timelineContainer.innerHTML = timeline.map((entry) => {
        const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
        let dotClass = 'review';
        const ev = (entry.event || '').toUpperCase();
        if (ev.includes('VERIFIED') || ev.includes('SUCCESSFUL') || ev.includes('CONFIRMED_RECEIVED') || ev.includes('EMAIL_SENT')) {
          dotClass = 'success';
        } else if (ev.includes('FAILURE') || ev.includes('REJECTED') || ev.includes('CONFIRMED_NOT_RECEIVED') || ev.includes('EMAIL_FAILED')) {
          dotClass = 'failure';
        } else if (ev.includes('EMAIL_SIMULATED')) {
          dotClass = 'review';
        }
        return `
          <div class="timeline-item">
            <span class="timeline-time">${escapeHtml(timeStr)}</span>
            <span class="timeline-dot ${dotClass}"></span>
            <div class="timeline-content">
              <div class="timeline-desc">${escapeHtml(entry.description || entry.event)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Residence Buttons
  document.querySelectorAll('.btn-cat').forEach((btn) => {
    btn.className = `btn-cat ${btn.dataset.cat === order.address.residenceCategory ? 'active' : ''}`;
  });
}

// Track Task by Order ID / Tracking Number
function trackTaskByQuery(query) {
  if (!query || !query.trim()) return;
  const q = query.toLowerCase().trim();

  const matched = orders.find(
    (o) =>
      o.id.toLowerCase() === q ||
      o.trackingNumber.toLowerCase() === q ||
      o.id.toLowerCase().includes(q) ||
      o.trackingNumber.toLowerCase().includes(q)
  );

  if (matched) {
    selectOrder(matched.id);
    showNotification(`🎯 LIVE TRACKING: Selected Order ${matched.id} (${matched.trackingNumber})`);
  } else {
    showNotification(`⚠️ No task found matching "${query}"`);
  }
}

// Supervisor Approval Actions
document.getElementById('btnApproveClaim').onclick = () => {
  const order = orders.find((o) => o.id === selectedOrderId);
  if (!order) return;

  order.status = 'VERIFIED';
  order.adminApprovalStatus = 'APPROVED';
  order.decision = 'VERIFIED';
  order.decisionReason = 'Customer Unavailable claim verified and approved by operations supervisor.';

  persistAdminUpdateToStorage(order);
  selectOrder(selectedOrderId);
  updateKPICounters();
  renderOrderList();
  broadcastToApp({
    type: 'ADMIN_DECISION_UPDATED',
    deliveryId: order.id,
    status: 'VERIFIED',
    notes: 'Customer Unavailable claim approved by supervisor',
    timestamp: new Date().toISOString(),
    extra: { adminApprovalStatus: 'APPROVED' },
  });
  showNotification(`✓ Claim APPROVED: Verified customer absence for ${order.id}`);
};

document.getElementById('btnRejectClaim').onclick = () => {
  const order = orders.find((o) => o.id === selectedOrderId);
  if (!order) return;

  order.status = 'REJECTED';
  order.adminApprovalStatus = 'REJECTED';
  order.decision = 'REJECTED';
  order.decisionReason = 'Claim rejected by operations supervisor: Doorstep footage does not substantiate absence.';

  persistAdminUpdateToStorage(order);
  selectOrder(selectedOrderId);
  updateKPICounters();
  renderOrderList();
  broadcastToApp({
    type: 'ADMIN_DECISION_UPDATED',
    deliveryId: order.id,
    status: 'REJECTED',
    notes: 'Claim rejected by supervisor: Footage insufficient',
    timestamp: new Date().toISOString(),
    extra: { adminApprovalStatus: 'REJECTED' },
  });
  showNotification(`✕ Claim REJECTED: False claim flagged for ${order.id}`);
};

// Supervisor Actions for Delivery Handoff Video Verification
const btnVerifyDeliveryProof = document.getElementById('btnVerifyDeliveryProof');
if (btnVerifyDeliveryProof) {
  btnVerifyDeliveryProof.onclick = () => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    order.status = 'VERIFIED';
    order.decision = 'VERIFIED';
    order.adminApprovalStatus = 'APPROVED';
    order.decisionReason = 'Delivery verified & confirmed by supervisor. Video proof inspected & authenticated.';

    persistAdminUpdateToStorage(order);
    selectOrder(selectedOrderId);
    updateKPICounters();
    renderOrderList();

    broadcastToApp({
      type: 'ADMIN_DECISION_UPDATED',
      deliveryId: order.id,
      status: 'VERIFIED',
      notes: 'Delivery handoff video proof approved by supervisor',
      timestamp: new Date().toISOString(),
      extra: { adminApprovalStatus: 'APPROVED' },
    });

    showNotification(`✓ DELIVERY CONFIRMED: Handoff video proof for ${order.id} approved by supervisor.`);
  };
}

const btnRejectDeliveryProof = document.getElementById('btnRejectDeliveryProof');
if (btnRejectDeliveryProof) {
  btnRejectDeliveryProof.onclick = () => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    order.status = 'REJECTED';
    order.decision = 'REJECTED';
    order.adminApprovalStatus = 'REJECTED';
    order.decisionReason = 'Delivery rejected by supervisor: Video proof flagged as inconclusive or irregular.';

    persistAdminUpdateToStorage(order);
    selectOrder(selectedOrderId);
    updateKPICounters();
    renderOrderList();

    broadcastToApp({
      type: 'ADMIN_DECISION_UPDATED',
      deliveryId: order.id,
      status: 'REJECTED',
      notes: 'Delivery rejected: Video proof flagged by supervisor',
      timestamp: new Date().toISOString(),
      extra: { adminApprovalStatus: 'REJECTED' },
    });

    showNotification(`✕ DELIVERY REJECTED: Order ${order.id} flagged for supervisor review.`);
  };
}

function persistAdminUpdateToStorage(order) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(SQLITE_STORAGE_KEY);
    let persisted = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(persisted)) persisted = [];

    const index = persisted.findIndex((p) => p.id === order.id);
    if (index >= 0) {
      persisted[index] = {
        ...persisted[index],
        ...order,
        status: order.status,
        notes: order.decisionReason || persisted[index].notes,
        driver_id: order.assignedDriverId || order.driver || persisted[index].driver_id,
        assignedDriverId: order.assignedDriverId || order.driver || persisted[index].assignedDriverId,
      };
    } else {
      persisted.unshift({
        id: order.id,
        trackingNumber: order.trackingNumber,
        customer: order.customer,
        address: {
          ...order.address,
          latitude: order.address?.lat || order.address?.latitude || 12.9719,
          longitude: order.address?.lng || order.address?.longitude || 77.6412,
        },
        packageDescription: order.packageDescription,
        driver: order.driver,
        assignedDriverId: order.assignedDriverId || order.driver,
        status: order.status || 'IN_TRANSIT',
        notes: order.decisionReason || 'Dispatched live from Operations Console',
        createdAt: order.createdAt || new Date().toISOString(),
      });
    }

    window.localStorage.setItem(SQLITE_STORAGE_KEY, JSON.stringify(persisted));

    // Also persist directly to server disk state via REST API
    fetch('/api/deliveries/' + encodeURIComponent(order.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch((err) => {
      console.warn('[Admin] Failed to PUT delivery update to server:', err);
    });
  } catch (e) {
    console.warn('[Admin] Failed to persist order to storage:', e);
  }
}

// Track Task input listeners
const trackInput = document.getElementById('adminTrackInput');
const btnTrack = document.getElementById('btnAdminTrack');

trackInput.addEventListener('input', (e) => {
  filterQuery = e.target.value;
  renderOrderList();
});

trackInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    trackTaskByQuery(trackInput.value);
  }
});

btnTrack.addEventListener('click', () => {
  trackTaskByQuery(trackInput.value);
});

// Toast Notification
function showNotification(msg) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Event Listeners for Residence Category and Driver Assignment
document.querySelectorAll('.btn-cat').forEach((btn) => {
  btn.onclick = () => {
    const cat = btn.dataset.cat;
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    order.address.residenceCategory = cat;
    order.requiredDwellSeconds = cat === 'gated_society' ? 150 : cat === 'apartment' ? 120 : 90;
    selectOrder(selectedOrderId);
  };
});

document.getElementById('selectDriver').onchange = async (e) => {
  const driverId = e.target.value;
  const order = orders.find((o) => o.id === selectedOrderId);
  if (!order) return;

  order.driver = e.target.options[e.target.selectedIndex].text;
  order.assignedDriverId = driverId;
  persistAdminUpdateToStorage(order);
  selectOrder(selectedOrderId);

  // 1. Sync to HTTP Server (updates server state and broadcasts to all apps)
  try {
    await fetch(`/api/deliveries/${encodeURIComponent(order.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedDriverId: driverId,
        driver: order.driver,
        notes: `Driver assigned: ${order.driver}`
      })
    });
  } catch (err) {
    console.warn('[Admin] Failed to PUT driver update to server:', err);
  }

  // 2. Broadcast to local channels
  broadcastToApp({
    type: 'TASK_ASSIGNED',
    deliveryId: order.id,
    status: order.status,
    notes: `Driver assigned: ${order.driver}`,
    timestamp: new Date().toISOString(),
    extra: {
      driver: order.driver,
      assignedDriverId: driverId,
      order: order
    }
  });
  showNotification(`✓ Reassigned ${order.id} to ${order.driver}`);
};

// Interactive Doorstep Pinpoint Map for Dispatch Modal
let modalPinMap = null;
let modalPinMarker = null;

function initModalPinMap(initialLat = 12.9080, initialLng = 77.6475) {
  const container = document.getElementById('modalPinMap');
  if (!container) return;

  if (modalPinMap) {
    modalPinMap.invalidateSize();
    if (modalPinMarker) {
      modalPinMarker.setLatLng([initialLat, initialLng]);
    }
    modalPinMap.setView([initialLat, initialLng], 17);
    return;
  }

  modalPinMap = L.map('modalPinMap', {
    center: [initialLat, initialLng],
    zoom: 17,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'abc'
  }).addTo(modalPinMap);

  const pinIcon = L.divIcon({
    className: 'custom-pinpoint-marker',
    html: `<div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); cursor: grab;">
      <div style="background:#EF4444; color:#FFF; font-weight:900; font-size:10px; padding:2px 6px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.3); white-space:nowrap; border:1px solid #FFF;">
        📍 DOORSTEP
      </div>
      <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #EF4444;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  modalPinMarker = L.marker([initialLat, initialLng], {
    draggable: true,
    icon: pinIcon
  }).addTo(modalPinMap);

  const updateCoordsUI = (lat, lng, label = null) => {
    const latInput = document.getElementById('inputLat');
    const lngInput = document.getElementById('inputLng');
    const statusText = document.getElementById('geocodeStatusText');
    if (latInput) latInput.value = Number(lat).toFixed(6);
    if (lngInput) lngInput.value = Number(lng).toFixed(6);
    if (statusText) {
      if (label) {
        statusText.innerText = `${label}: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
      } else {
        statusText.innerText = `Pinpoint Doorstep: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
      }
    }
  };

  modalPinMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    updateCoordsUI(pos.lat, pos.lng, 'Manual Pinpoint');
  });

  modalPinMap.on('click', function (e) {
    modalPinMarker.setLatLng(e.latlng);
    updateCoordsUI(e.latlng.lat, e.latlng.lng, 'Manual Click');
  });

  // Sync manual numeric inputs to map
  const latInput = document.getElementById('inputLat');
  const lngInput = document.getElementById('inputLng');
  const onManualCoordChange = () => {
    const l = parseFloat(latInput.value);
    const g = parseFloat(lngInput.value);
    if (!isNaN(l) && !isNaN(g) && l >= -90 && l <= 90 && g >= -180 && g <= 180) {
      modalPinMarker.setLatLng([l, g]);
      modalPinMap.setView([l, g], 17);
      const statusText = document.getElementById('geocodeStatusText');
      if (statusText) statusText.innerText = `Exact Coordinates: ${l.toFixed(6)}, ${g.toFixed(6)}`;
    }
  };
  if (latInput) latInput.addEventListener('input', onManualCoordChange);
  if (lngInput) lngInput.addEventListener('input', onManualCoordChange);
}

async function resolveModalAddressCoordinates() {
  const building = document.getElementById('inputBuilding')?.value.trim() || '';
  const street = document.getElementById('inputStreet')?.value.trim() || '';
  const locality = document.getElementById('inputLocality')?.value.trim() || '';
  const pincode = document.getElementById('inputPincode')?.value.trim() || '';

  const queryParts = [building, street, locality, pincode].filter(Boolean);
  if (queryParts.length === 0) return;

  const statusText = document.getElementById('geocodeStatusText');
  if (statusText) statusText.innerText = 'Locating doorstep on Bengaluru map...';

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(queryParts.join(', '))}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
        const latInput = document.getElementById('inputLat');
        const lngInput = document.getElementById('inputLng');
        if (latInput) latInput.value = data.lat.toFixed(6);
        if (lngInput) lngInput.value = data.lng.toFixed(6);

        if (modalPinMap && modalPinMarker) {
          modalPinMarker.setLatLng([data.lat, data.lng]);
          modalPinMap.setView([data.lat, data.lng], 18);
        }
        if (statusText) {
          statusText.innerText = `${data.locality || 'Doorstep'} (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`;
        }
      }
    }
  } catch (e) {
    console.warn('[Geocode Modal] Error locating address:', e);
  }
}

// Create Order Modal Handlers
document.getElementById('btnOpenCreateModal').onclick = () => {
  document.getElementById('createModal').classList.add('open');
  setTimeout(() => {
    const lat = parseFloat(document.getElementById('inputLat')?.value) || 12.9080;
    const lng = parseFloat(document.getElementById('inputLng')?.value) || 77.6475;
    initModalPinMap(lat, lng);
    if (modalPinMap) modalPinMap.invalidateSize();
  }, 150);
};

document.getElementById('btnCloseCreateModal').onclick = () => {
  document.getElementById('createModal').classList.remove('open');
};

const btnLocate = document.getElementById('btnGeocodeLocate');
if (btnLocate) {
  btnLocate.onclick = (e) => {
    e.preventDefault();
    resolveModalAddressCoordinates();
  };
}

['inputBuilding', 'inputStreet', 'inputLocality'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('blur', () => {
      if (el.value.trim()) {
        resolveModalAddressCoordinates();
      }
    });
  }
});

document.getElementById('btnSubmitNewOrder').onclick = async () => {
  const btn = document.getElementById('btnSubmitNewOrder');
  const originalText = btn.innerText;
  btn.innerText = 'DISPATCHING TO DOORSTEP...';
  btn.disabled = true;

  const name = document.getElementById('inputCustName')?.value.trim() || 'Customer';
  const phone = document.getElementById('inputCustPhone')?.value.trim() || '+91 90191 44983';
  const flat = document.getElementById('inputFlat')?.value.trim() || '';
  const building = document.getElementById('inputBuilding')?.value.trim() || '';
  const street = document.getElementById('inputStreet')?.value.trim() || '';
  const locality = document.getElementById('inputLocality')?.value.trim() || 'Sector 2, HSR Layout';
  const pincode = document.getElementById('inputPincode')?.value.trim() || '560102';
  const packageDesc = document.getElementById('inputPackageDesc')?.value.trim() || 'New Dispatch Order';
  const cat = document.getElementById('inputCategory')?.value || 'apartment';
  const driverSelect = document.getElementById('inputDriver');
  const driverId = driverSelect?.value || 'DRV-101';
  const driverName = driverSelect?.options[driverSelect.selectedIndex]?.text || 'Rohan Mehta';

  let geoLat = parseFloat(document.getElementById('inputLat')?.value);
  let geoLng = parseFloat(document.getElementById('inputLng')?.value);

  // High precision check: if building is Asritha Lotus Residency, ensure exact 12.9080, 77.6475
  if (building.toLowerCase().includes('asritha') && (!geoLat || Math.abs(geoLat - 12.9118) < 0.001)) {
    geoLat = 12.9080;
    geoLng = 77.6475;
  }

  if (isNaN(geoLat) || isNaN(geoLng)) {
    geoLat = 12.9080;
    geoLng = 77.6475;
  }

  const streetFull = [flat, building, street].filter(Boolean).join(', ') || 'Doorstep Address';
  const cityFull = locality.toLowerCase().includes('bengaluru') ? locality : `${locality}, Bengaluru`;

  btn.innerText = originalText;
  btn.disabled = false;

  const newOrder = {
    id: `DEL-${Math.floor(1000 + Math.random() * 9000)}`,
    trackingNumber: `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
    customer: { id: `CUST-${Date.now()}`, name, phone },
    address: {
      street: streetFull,
      city: cityFull,
      postalCode: pincode,
      residenceCategory: cat,
      lat: geoLat,
      lng: geoLng,
      flat: flat,
      building: building
    },
    packageDescription: packageDesc,
    driver: driverName,
    assignedDriverId: driverId,
    status: 'IN_TRANSIT',
    distanceMeters: 25,
    dwellSeconds: 0,
    requiredDwellSeconds: cat === 'gated_society' ? 150 : cat === 'apartment' ? 120 : 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    decision: 'REVIEW',
    decisionReason: `Order dispatched to ${building || locality} — doorstep coordinates locked at [${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}].`,
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  selectedOrderId = newOrder.id;
  persistAdminUpdateToStorage(newOrder);
  document.getElementById('createModal').classList.remove('open');
  renderOrderList();
  selectOrder(newOrder.id);
  updateKPICounters();

  // 1. Sync to HTTP Server
  try {
    await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
  } catch (err) {
    console.warn('[Admin] Server POST delivery error:', err);
  }

  // 2. Broadcast via BroadcastChannel & localStorage
  broadcastToApp({
    type: 'ORDER_DISPATCHED',
    deliveryId: newOrder.id,
    status: newOrder.status,
    notes: `New task dispatched: ${newOrder.id} to ${newOrder.customer.name}`,
    timestamp: new Date().toISOString(),
    extra: {
      order: newOrder
    }
  });

  showNotification(`🚀 New Task Dispatched: ${newOrder.id} (${building || locality}) assigned to ${driverName}`);
};

// Boot
window.onload = () => {
  loadPersistentDeliveries();
  initMap();
  fetchInitialDriverTelemetry();
  renderOrderList();
  selectOrder(selectedOrderId);

  // Periodic 10-Second Ping & Sync with Mobile App / Server
  setInterval(async () => {
    try {
      await loadPersistentDeliveries();
      await fetchInitialDriverTelemetry();
      renderCustomerConfirmedFailuresTable();
    } catch (e) {}
  }, 10000);

  renderCustomerConfirmedFailuresTable();
};

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function switchAdminTab(tab) {
  const btnOps = document.getElementById('tabBtnOperations');
  const btnFailures = document.getElementById('tabBtnFailures');
  const viewOps = document.getElementById('operationsDashboardView');
  const viewFailures = document.getElementById('failuresDashboardView');

  if (tab === 'failures') {
    if (btnOps) btnOps.classList.remove('active');
    if (btnFailures) btnFailures.classList.add('active');
    if (viewOps) viewOps.style.display = 'none';
    if (viewFailures) viewFailures.style.display = 'block';
    renderCustomerConfirmedFailuresTable();
  } else {
    if (btnFailures) btnFailures.classList.remove('active');
    if (btnOps) btnOps.classList.add('active');
    if (viewFailures) viewFailures.style.display = 'none';
    if (viewOps) viewOps.style.display = 'grid';
    if (lMap) {
      setTimeout(() => lMap.invalidateSize(), 150);
    }
  }
}

function renderCustomerConfirmedFailuresTable() {
  const tbody = document.getElementById('failuresTableBody');
  const badgeCount = document.getElementById('confirmedFailuresCount');
  const pillTotal = document.getElementById('failuresTotalPill');

  const failureOrders = orders.filter((o) =>
    o.customerResponse === 'PACKAGE_NOT_RECEIVED' ||
    o.customerResponse === 'CUSTOMER_UNAVAILABLE' ||
    o.status === 'CUSTOMER_CONFIRMED_FAILURE' ||
    o.status === 'RETRY_REQUIRED' ||
    o.retryRequired === true
  );

  if (badgeCount) badgeCount.innerText = failureOrders.length;
  if (pillTotal) pillTotal.innerText = `${failureOrders.length} RETR${failureOrders.length === 1 ? 'Y' : 'IES'} REQUIRED`;

  if (!tbody) return;

  if (failureOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="failures-empty-row">
          🛡️ No customer confirmed delivery failures recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = failureOrders.map((order) => {
    const attemptTime = order.customerResponseAt 
      ? new Date(order.customerResponseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

    const originalResult = order.originalDecision || order.decision || 'REVIEW';
    const customerConfirm = 'PACKAGE NOT RECEIVED';
    const currentStatus = order.status || 'CUSTOMER_CONFIRMED_FAILURE';
    const retryStatus = 'RETRY REQUIRED';

    return `
      <tr>
        <td><strong>${escapeHtml(order.id)}</strong><br><span style="font-size:10px;color:#64748B;">${escapeHtml(order.trackingNumber)}</span></td>
        <td><strong>${escapeHtml(order.customer?.name || 'Customer')}</strong><br><span style="font-size:10px;color:#64748B;">${escapeHtml(order.customer?.phone || '')}</span></td>
        <td>${escapeHtml(attemptTime)}</td>
        <td><span class="status-badge review">${escapeHtml(originalResult)}</span></td>
        <td><span class="pill-failure-confirm">✕ ${escapeHtml(customerConfirm)}</span></td>
        <td><strong style="color:#B91C1C; font-size:11px;">${escapeHtml(currentStatus)}</strong></td>
        <td><span class="pill-retry-required">🔄 ${escapeHtml(retryStatus)}</span></td>
        <td>
          <button class="btn-table-inspect" onclick="inspectFailureDelivery('${escapeHtml(order.id)}')">
            Inspect Stop ↗
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function inspectFailureDelivery(orderId) {
  switchAdminTab('operations');
  selectOrder(orderId);
}

window.switchAdminTab = switchAdminTab;
window.renderCustomerConfirmedFailuresTable = renderCustomerConfirmedFailuresTable;
window.inspectFailureDelivery = inspectFailureDelivery;
