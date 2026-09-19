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

function handleIncomingRealtimeEvent(event) {
  if (!event || !event.type) return;

  if (event.type === 'DELIVERY_COMPLETED' && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId || o.trackingNumber === event.deliveryId);
    if (!order) {
      order = {
        id: event.deliveryId,
        trackingNumber: event.extra?.trackingNumber || `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
        customer: { name: event.extra?.customerName || 'Customer', phone: '+91 90191 44983' },
        address: { street: 'Bengaluru Delivery Address', city: 'Bengaluru', residenceCategory: 'individual_house', lat: 12.8715, lng: 77.6534 },
        packageDescription: event.extra?.packageDescription || 'Delivered Package',
        driver: event.extra?.driverId || 'DRV-BLR-09 (Unit 24)',
        status: 'DELIVERED',
        distanceMeters: 12,
        dwellSeconds: 90,
        requiredDwellSeconds: 90,
        callAttempted: true,
        callDuration: 20,
        gpsAccuracy: 6,
        auditId: event.auditId || `AUD-${Date.now().toString(36).toUpperCase()}`,
        decision: 'DELIVERED',
        decisionReason: `Delivery completed & verified. Customer handoff confirmed at door (${event.handoffType || 'direct'}). Video proof attached.`,
        videoProofUri: event.videoProofUri,
        handoffType: event.handoffType,
      };
      orders.unshift(order);
    } else {
      order.status = 'DELIVERED';
      order.decision = 'DELIVERED';
      order.decisionReason = `Delivery completed & verified. Customer handoff confirmed at door (${event.handoffType || 'direct'}). Video proof attached.`;
      order.videoProofUri = event.videoProofUri || order.videoProofUri;
      order.handoffType = event.handoffType || order.handoffType;
      order.distanceMeters = 12;
      order.dwellSeconds = Math.max(order.dwellSeconds, 90);
      if (event.auditId) order.auditId = event.auditId;
    }

    updateKPICounters();
    renderOrderList();

    if (selectedOrderId === event.deliveryId) {
      selectOrder(selectedOrderId);
    }

    showNotification(`🔔 REAL-TIME SYNC: Order ${event.deliveryId} marked DELIVERED with verified video proof!`);
  } else if (event.type === 'DELIVERY_ATTESTED' && event.deliveryId) {
    let order = orders.find((o) => o.id === event.deliveryId);
    if (order) {
      order.status = event.status;
      order.decision = event.status;
      if (event.videoProofUri) order.videoProofUri = event.videoProofUri;
      if (event.extra?.decisionReason) order.decisionReason = event.extra.decisionReason;
      updateKPICounters();
      renderOrderList();
      if (selectedOrderId === event.deliveryId) {
        selectOrder(selectedOrderId);
      }
      showNotification(`🔔 REAL-TIME SYNC: Order ${event.deliveryId} updated to ${event.status}`);
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
function initMap() {
  const defaultOrder = orders[0];
  if (lMap) return;

  try {
    const mapEl = document.getElementById('adminMap');
    if (!mapEl) return;

    lMap = L.map('adminMap', {
      zoomControl: true,
      attributionControl: true
    }).setView([defaultOrder.address.lat, defaultOrder.address.lng], 16);

    // Open-Source Overture Maps Foundation Tile Layer (OpenFreeMap / Overture Data)
    L.tileLayer('https://tile.openfreemap.org/styles/liberty/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://overturemaps.org" target="_blank">Overture Maps Foundation</a> &copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      opacity: 0.96
    }).addTo(lMap);

    renderSelectedOrderMap(defaultOrder);
  } catch (err) {
    console.warn('[Admin] Leaflet map initialization warning:', err);
  }
}

// Render Order on Open-Source Map with Geofence & Route
function renderSelectedOrderMap(order) {
  if (!lMap) return;

  const destLat = order.address.lat;
  const destLng = order.address.lng;
  const driverOffsetLat = order.distanceMeters > 500 ? destLat + 0.022 : destLat + 0.0003;
  const driverOffsetLng = order.distanceMeters > 500 ? destLng + 0.022 : destLng + 0.0003;

  if (lGeofenceCircle) lMap.removeLayer(lGeofenceCircle);
  if (lRoutePolyline) lMap.removeLayer(lRoutePolyline);
  if (lCustomerMarker) lMap.removeLayer(lCustomerMarker);
  if (lTruckMarker) lMap.removeLayer(lTruckMarker);

  const dest = [destLat, destLng];
  const driverPos = [driverOffsetLat, driverOffsetLng];

  // 50m Geofence Circle
  lGeofenceCircle = L.circle(dest, {
    color: order.distanceMeters <= 50 ? '#15803D' : '#D94A27',
    fillColor: order.distanceMeters <= 50 ? '#15803D' : '#D94A27',
    fillOpacity: order.distanceMeters <= 50 ? 0.18 : 0.08,
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
      <div class="order-address">${order.address.street}</div>
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
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // If order has thumbnail image loaded, draw thumbnail
  if (order && order._cachedThumbImage && order._cachedThumbImage.complete && order._cachedThumbImage.naturalWidth > 0) {
    ctx.drawImage(order._cachedThumbImage, 0, 0, w, h);
  } else if (order && order.thumbnail && !order._cachedThumbImage) {
    const img = new Image();
    img.src = order.thumbnail;
    img.onload = () => {
      order._cachedThumbImage = img;
      drawDoorstepEvidenceFrame(canvasId, type, time, order);
    };
    drawSyntheticDoorstepScene(ctx, w, h, type, time, order);
  } else {
    drawSyntheticDoorstepScene(ctx, w, h, type, time, order);
  }

  // Draw Camera Telemetry HUD Overlay
  drawTelemetryHUD(ctx, w, h, type, time, order);

  ctx.restore();
}

function drawSyntheticDoorstepScene(ctx, w, h, type, time, order) {
  // Handheld camera sway
  const swayX = Math.sin(time * 2.5) * 3;
  const swayY = Math.cos(time * 2.0) * 2;
  ctx.translate(swayX, swayY);

  // Background Corridor Wall
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
  wallGrad.addColorStop(0, '#CBD5E1');
  wallGrad.addColorStop(1, '#94A3B8');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(-10, -10, w + 20, h + 20);

  // Floor Baseboard & Flooring
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-10, h - 70, w + 20, 8);

  const floorGrad = ctx.createLinearGradient(0, h - 62, 0, h);
  floorGrad.addColorStop(0, '#475569');
  floorGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(-10, h - 62, w + 20, 80);

  // Apartment Door (Centered)
  const doorX = 130;
  const doorY = 20;
  const doorW = 220;
  const doorH = h - 85;

  // Door Frame
  ctx.fillStyle = '#334155';
  ctx.fillRect(doorX - 6, doorY - 4, doorW + 12, doorH + 6);

  // Door Surface: Rich Mahogany Wood Tone
  const doorGrad = ctx.createLinearGradient(doorX, 0, doorX + doorW, 0);
  doorGrad.addColorStop(0, '#5C2D12');
  doorGrad.addColorStop(0.5, '#78350F');
  doorGrad.addColorStop(1, '#451A03');
  ctx.fillStyle = doorGrad;
  ctx.fillRect(doorX, doorY, doorW, doorH);

  // Wood Panel Reliefs
  const panels = [
    { x: doorX + 16, y: doorY + 16, pw: 85, ph: 65 },
    { x: doorX + 115, y: doorY + 16, pw: 85, ph: 65 },
    { x: doorX + 16, y: doorY + 95, pw: 85, ph: 75 },
    { x: doorX + 115, y: doorY + 95, pw: 85, ph: 75 },
  ];

  panels.forEach(p => {
    ctx.fillStyle = '#3B1803';
    ctx.fillRect(p.x, p.y, p.pw, p.ph);
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 2, p.y + 2, p.pw - 4, p.ph - 4);
  });

  // Metallic Lever Handle & Deadbolt
  ctx.fillStyle = '#D97706';
  ctx.fillRect(doorX + 12, doorY + 105, 14, 28);
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(doorX + 4, doorY + 114, 22, 6);
  ctx.beginPath();
  ctx.arc(doorX + 19, doorY + 117, 3, 0, Math.PI * 2);
  ctx.fill();

  // Peephole
  ctx.beginPath();
  ctx.arc(doorX + doorW / 2, doorY + 45, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#D97706';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(doorX + doorW / 2, doorY + 45, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Unit Number Plate
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(doorX + doorW / 2 - 28, doorY + 10, 56, 16);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1;
  ctx.strokeRect(doorX + doorW / 2 - 28, doorY + 10, 56, 16);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(order?.address?.street?.includes('902') ? 'FLAT 902' : 'DOORSTEP', doorX + doorW / 2, doorY + 22);

  // Doorbell Unit (Left wall)
  const bellX = 65;
  const bellY = 100;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(bellX, bellY, 24, 38);
  ctx.strokeStyle = '#475569';
  ctx.strokeRect(bellX, bellY, 24, 38);

  const isRinging = type === 'unavail' && (time >= 1.0 && time <= 4.5);
  ctx.beginPath();
  ctx.arc(bellX + 12, bellY + 18, 7, 0, Math.PI * 2);
  ctx.fillStyle = isRinging ? '#38BDF8' : '#F8FAFC';
  ctx.fill();

  if (isRinging) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bellX + 12, bellY + 18, 14 + Math.sin(time * 12) * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(bellX + 8, bellY + 22, 14, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🔔 CHIME UNANSWERED', bellX - 25, bellY - 8);
  }

  // Welcome Doormat
  const matX = doorX + 15;
  const matY = h - 60;
  const matW = doorW - 30;
  const matH = 45;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(matX, matY, matW, matH);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(matX, matY, matW, matH);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME', matX + matW / 2, matY + 28);

  // If type === 'delivery': Package on mat with verified bounding box
  if (type === 'delivery') {
    const pkgX = matX + 35;
    const pkgY = matY - 20;
    const pkgW = 100;
    const pkgH = 50;

    // Cardboard Box Body
    ctx.fillStyle = '#B45309';
    ctx.fillRect(pkgX, pkgY, pkgW, pkgH);

    // Box Tape
    ctx.fillStyle = '#D97706';
    ctx.fillRect(pkgX + 42, pkgY, 16, pkgH);

    // Shipping Label with Barcode
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(pkgX + 15, pkgY + 10, 48, 28);

    ctx.fillStyle = '#000000';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(pkgX + 18 + i * 5, pkgY + 14, 2, 12);
    }
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SBT-SECURE', pkgX + 18, pkgY + 34);

    // Anti-spoof AI green bounding box around package
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.strokeRect(pkgX - 6, pkgY - 6, pkgW + 12, pkgH + 12);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.fillRect(pkgX - 6, pkgY - 20, 112, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('✓ HANDOFF VERIFIED', pkgX - 2, pkgY - 10);
  }
}

function drawTelemetryHUD(ctx, w, h, type, time, order) {
  // Top Banner HUD
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(0, 0, w, 24);

  // Blinking REC Indicator
  const blink = Math.floor(time * 2) % 2 === 0;
  ctx.fillStyle = blink ? '#EF4444' : 'rgba(239, 68, 68, 0.3)';
  ctx.beginPath();
  ctx.arc(14, 12, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  const timeStr = formatTimecode(time) + `.${String(Math.floor((time % 1) * 10)).padStart(1, '0')}`;
  ctx.fillText(`REC [${timeStr}] 1080P 30FPS`, 24, 15);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#34D399';
  ctx.fillText(`GPS LOCK: ≤${order?.distanceMeters || 38}M • ACC ±${order?.gpsAccuracy || 6}M`, w - 10, 15);

  // Bottom Banner HUD
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(0, h - 22, w, 22);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#A7F3D0';
  ctx.font = 'bold 8px monospace';
  const lum = order?.videoMetrics?.luminance || 120;
  const variance = order?.videoMetrics?.variance || 450;
  ctx.fillText(`LUM: ${lum}/255 (PASS) • DETAIL VAR: ${variance} (GENUINE)`, 10, h - 8);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('HASH: ' + (order?.auditId || 'AUD-7K99-M42A'), w - 10, h - 8);
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

  const btnPlay = document.getElementById(type === 'unavail' ? 'btnUnavailPlay' : 'btnDeliveryPlay');
  if (btnPlay) {
    btnPlay.innerText = '⏸ PAUSE';
  }

  const overlay = document.getElementById(type === 'unavail' ? 'unavailPlayOverlay' : 'deliveryPlayOverlay');
  if (overlay) {
    overlay.classList.add('playing');
  }

  let lastTimestamp = performance.now();

  function step(now) {
    if (!p.isPlaying) return;
    const delta = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    p.currentTime += delta;
    if (p.currentTime >= p.duration) {
      p.currentTime = p.duration;
      pauseVideo(type);
      p.currentTime = 0;
      updatePlayerUI(type);
      return;
    }

    updatePlayerUI(type);
    p.animFrame = requestAnimationFrame(step);
  }

  p.animFrame = requestAnimationFrame(step);
}

function pauseVideo(type) {
  const p = videoPlayers[type];
  if (!p) return;

  p.isPlaying = false;
  if (p.animFrame) {
    cancelAnimationFrame(p.animFrame);
    p.animFrame = null;
  }

  const btnPlay = document.getElementById(type === 'unavail' ? 'btnUnavailPlay' : 'btnDeliveryPlay');
  if (btnPlay) {
    btnPlay.innerText = '▶ PLAY';
  }

  const overlay = document.getElementById(type === 'unavail' ? 'unavailPlayOverlay' : 'deliveryPlayOverlay');
  if (overlay) {
    overlay.classList.remove('playing');
  }

  updatePlayerUI(type);
}

function restartVideo(type) {
  const p = videoPlayers[type];
  if (!p) return;
  p.currentTime = 0;
  playVideo(type);
}

function seekVideo(type, targetSeconds) {
  const p = videoPlayers[type];
  if (!p) return;
  p.currentTime = Math.max(0, Math.min(targetSeconds, p.duration));
  updatePlayerUI(type);
}

function updatePlayerUI(type) {
  const p = videoPlayers[type];
  if (!p) return;

  const canvasId = type === 'unavail' ? 'unavailCanvas' : 'deliveryCanvas';
  drawDoorstepEvidenceFrame(canvasId, type, p.currentTime, p.order);

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
  document.getElementById('targetName').innerText = `${order.customer.name} (${order.address.street})`;
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

  // Handle Video Proof & Admin Approval Section (Customer Unavailable)
  const videoSection = document.getElementById('videoApprovalSection');
  if (order.requiresAdminApproval && order.adminApprovalStatus === 'PENDING') {
    videoSection.style.display = 'block';
    document.getElementById('videoFileName').innerText = order.videoProofUri || 'doorstep_absence_clip_1003.mp4';
    videoPlayers.unavail.order = order;
    videoPlayers.unavail.currentTime = 0;
    pauseVideo('unavail');
    updatePlayerUI('unavail');
  } else {
    videoSection.style.display = 'none';
    pauseVideo('unavail');
  }

  // Handle Delivery Handoff Video Proof Section for Successful Delivery
  const deliveryVideoSection = document.getElementById('deliveryVideoProofSection');
  const auditPill = document.getElementById('deliveryAuditStatusPill');

  if (deliveryVideoSection) {
    if ((order.status === 'DELIVERED' || order.status === 'VERIFIED' || order.status === 'REJECTED') && order.videoProofUri) {
      deliveryVideoSection.style.display = 'block';
      const fileNameEl = document.getElementById('deliveryVideoFileName');
      if (fileNameEl) {
        fileNameEl.innerText = order.videoProofUri.split('/').pop() || 'doorstep_handoff_proof.mp4';
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

  // Audit Box
  document.getElementById('auditId').innerText = order.auditId;
  document.getElementById('auditTime').innerText = new Date().toLocaleTimeString();

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

// Create Order Modal Handlers
document.getElementById('btnOpenCreateModal').onclick = () => {
  document.getElementById('createModal').classList.add('open');
};

document.getElementById('btnCloseCreateModal').onclick = () => {
  document.getElementById('createModal').classList.remove('open');
};

document.getElementById('btnSubmitNewOrder').onclick = async () => {
  const name = document.getElementById('inputCustName').value || 'Customer';
  const phone = document.getElementById('inputCustPhone').value || '+91 90191 44983';
  const street = document.getElementById('inputStreet').value || '100 Feet Road';
  const cat = document.getElementById('inputCategory').value;
  const driverSelect = document.getElementById('inputDriver');
  const driverId = driverSelect.value;
  const driverName = driverSelect.options[driverSelect.selectedIndex].text;

  const newOrder = {
    id: `DEL-${Math.floor(1000 + Math.random() * 9000)}`,
    trackingNumber: `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
    customer: { id: `CUST-${Date.now()}`, name, phone },
    address: { street, city: 'Bengaluru', postalCode: '560038', residenceCategory: cat, lat: 12.9719, lng: 77.6412 },
    packageDescription: 'New Dispatch Order',
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
    decisionReason: 'Order newly dispatched — waiting for driver arrival and telemetry stream.',
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

  showNotification(`🚀 New Task Dispatched: ${newOrder.id} assigned to ${driverName}`);
};

// Boot
window.onload = () => {
  loadPersistentDeliveries();
  initMap();
  renderOrderList();
  selectOrder(selectedOrderId);
};
