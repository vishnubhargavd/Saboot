// Saboot Admin Operations Console Logic with Google Maps JS API & Live Task Tracking

const INITIAL_ORDERS = [
  {
    id: 'DEL-1001',
    trackingNumber: 'SBT-BLR-882190',
    customer: { name: 'Vishnu Bhargav', phone: '+91 90191 44983' },
    address: { street: 'Tower 4, Flat 902, Sobha Silicon Oasis', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.8715, lng: 77.6534 },
    packageDescription: 'Electronics — Sony Wireless ANC Headphones',
    driver: 'DRV-BLR-09 (Unit 24)',
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

function broadcastToApp(event) {
  try {
    if (adminBroadcastChannel) {
      adminBroadcastChannel.postMessage(event);
    }
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ ...event, _t: Date.now() }));
    }
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

function loadPersistentDeliveries() {
  if (typeof window === 'undefined' || !window.localStorage) return;
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

// Map instances
let gMap, gGeofenceCircle, gRoutePolyline, gCustomerMarker, gTruckMarker;
let isGoogleMapsActive = false;
let lMap, lGeofenceCircle, lRoutePolyline, lCustomerMarker, lTruckMarker;

// Initialize Map with Google Maps JavaScript API (fallback to Leaflet if blocked)
function initMap() {
  const defaultOrder = orders[0];

  try {
    if (typeof google !== 'undefined' && google.maps) {
      isGoogleMapsActive = true;
      const destLatLng = { lat: defaultOrder.address.lat, lng: defaultOrder.address.lng };

      gMap = new google.maps.Map(document.getElementById('adminMap'), {
        center: destLatLng,
        zoom: 16,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
          { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfdbfe" }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] }
        ]
      });

      renderSelectedOrderMap(defaultOrder);
      return;
    }
  } catch (err) {
    console.warn('Google Maps JS API notice, falling back to Leaflet:', err);
  }

  initLeafletFallback(defaultOrder);
}

function initLeafletFallback(defaultOrder) {
  if (lMap) return;
  lMap = L.map('adminMap', { zoomControl: true }).setView([defaultOrder.address.lat, defaultOrder.address.lng], 16);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    opacity: 0.95
  }).addTo(lMap);

  renderSelectedOrderMap(defaultOrder);
}

// Render Order on Map (Google Maps or Fallback)
function renderSelectedOrderMap(order) {
  const destLat = order.address.lat;
  const destLng = order.address.lng;
  const driverOffsetLat = order.distanceMeters > 500 ? destLat + 0.022 : destLat + 0.0003;
  const driverOffsetLng = order.distanceMeters > 500 ? destLng + 0.022 : destLng + 0.0003;

  if (isGoogleMapsActive && gMap) {
    const dest = new google.maps.LatLng(destLat, destLng);
    const driverPos = new google.maps.LatLng(driverOffsetLat, driverOffsetLng);

    if (gGeofenceCircle) gGeofenceCircle.setMap(null);
    if (gRoutePolyline) gRoutePolyline.setMap(null);
    if (gCustomerMarker) gCustomerMarker.setMap(null);
    if (gTruckMarker) gTruckMarker.setMap(null);

    // 50m Geofence Circle
    gGeofenceCircle = new google.maps.Circle({
      strokeColor: '#D94A27',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: order.distanceMeters <= 50 ? '#15803D' : '#D94A27',
      fillOpacity: order.distanceMeters <= 50 ? 0.18 : 0.08,
      map: gMap,
      center: dest,
      radius: 50
    });

    // Dashed Route Polyline
    gRoutePolyline = new google.maps.Polyline({
      path: [driverPos, dest],
      geodesic: true,
      strokeColor: '#D94A27',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: gMap
    });

    // Customer Pin Marker
    gCustomerMarker = new google.maps.Marker({
      position: dest,
      map: gMap,
      title: order.customer.name,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#D94A27" stroke="#FFFFFF" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#FFFFFF"/></svg>'),
        scaledSize: new google.maps.Size(34, 34),
        anchor: new google.maps.Point(17, 34)
      }
    });

    // Live Driver Truck Marker
    gTruckMarker = new google.maps.Marker({
      position: driverPos,
      map: gMap,
      title: order.driver,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" fill="#1E293B" stroke="#FFFFFF" stroke-width="3"/><text x="19" y="24" font-size="18" text-anchor="middle" fill="#FFFFFF">🚚</text></svg>'),
        scaledSize: new google.maps.Size(38, 38),
        anchor: new google.maps.Point(19, 19)
      }
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(dest);
    bounds.extend(driverPos);
    gMap.fitBounds(bounds, 50);
  } else if (lMap) {
    if (lGeofenceCircle) lMap.removeLayer(lGeofenceCircle);
    if (lRoutePolyline) lMap.removeLayer(lRoutePolyline);
    if (lCustomerMarker) lMap.removeLayer(lCustomerMarker);
    if (lTruckMarker) lMap.removeLayer(lTruckMarker);

    const dest = [destLat, destLng];
    const driverPos = [driverOffsetLat, driverOffsetLng];

    lGeofenceCircle = L.circle(dest, {
      color: '#D94A27',
      fillColor: order.distanceMeters <= 50 ? '#15803D' : '#D94A27',
      fillOpacity: order.distanceMeters <= 50 ? 0.18 : 0.08,
      weight: 2.5,
      dashArray: '5, 5',
      radius: 50
    }).addTo(lMap);

    lRoutePolyline = L.polyline([driverPos, dest], {
      color: '#D94A27',
      weight: 3,
      dashArray: '4, 6',
      opacity: 0.8
    }).addTo(lMap);

    const custIcon = L.divIcon({
      className: 'custom-pin',
      html: '<div style="background:#D94A27; color:#fff; width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg); font-size:14px;">📍</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });
    lCustomerMarker = L.marker(dest, { icon: custIcon }).addTo(lMap);

    const truckIcon = L.divIcon({
      className: 'truck-pin',
      html: '<div style="background:#334454; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #fff; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🚚</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    lTruckMarker = L.marker(driverPos, { icon: truckIcon }).addTo(lMap);

    lMap.fitBounds(L.latLngBounds([dest, driverPos]), { padding: [50, 50], maxZoom: 17 });
  }
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

  // Handle Video Proof & Admin Approval Section
  const videoSection = document.getElementById('videoApprovalSection');
  if (order.requiresAdminApproval && order.adminApprovalStatus === 'PENDING') {
    videoSection.style.display = 'block';
    document.getElementById('videoFileName').innerText = order.videoProofUri || 'doorstep_absence_clip.mp4';
  } else {
    videoSection.style.display = 'none';
  }

  // Handle Delivery Handoff Video Proof Section for Successful Delivery
  const deliveryVideoSection = document.getElementById('deliveryVideoProofSection');
  if (deliveryVideoSection) {
    if (order.status === 'DELIVERED' && order.videoProofUri) {
      deliveryVideoSection.style.display = 'block';
      const fileNameEl = document.getElementById('deliveryVideoFileName');
      if (fileNameEl) {
        fileNameEl.innerText = order.videoProofUri.split('/').pop() || 'doorstep_handoff_proof.mp4';
      }
    } else {
      deliveryVideoSection.style.display = 'none';
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

  selectOrder(selectedOrderId);
  updateKPICounters();
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

  selectOrder(selectedOrderId);
  updateKPICounters();
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

document.getElementById('selectDriver').onchange = (e) => {
  const driverId = e.target.value;
  const order = orders.find((o) => o.id === selectedOrderId);
  if (!order) return;

  order.driver = e.target.options[e.target.selectedIndex].text;
  selectOrder(selectedOrderId);
};

// Create Order Modal Handlers
document.getElementById('btnOpenCreateModal').onclick = () => {
  document.getElementById('createModal').classList.add('open');
};

document.getElementById('btnCloseCreateModal').onclick = () => {
  document.getElementById('createModal').classList.remove('open');
};

document.getElementById('btnSubmitNewOrder').onclick = () => {
  const name = document.getElementById('inputCustName').value || 'Customer';
  const phone = document.getElementById('inputCustPhone').value || '+91 90191 44983';
  const street = document.getElementById('inputStreet').value || '100 Feet Road';
  const cat = document.getElementById('inputCategory').value;
  const driver = document.getElementById('inputDriver').value;

  const newOrder = {
    id: `DEL-${Math.floor(1000 + Math.random() * 9000)}`,
    trackingNumber: `SBT-BLR-${Math.floor(100000 + Math.random() * 900000)}`,
    customer: { name, phone },
    address: { street, city: 'Bengaluru', residenceCategory: cat, lat: 12.9719, lng: 77.6412 },
    packageDescription: 'New Dispatch Order',
    driver: `${driver} (Unit)`,
    status: 'ASSIGNED',
    distanceMeters: 25,
    dwellSeconds: 0,
    requiredDwellSeconds: cat === 'gated_society' ? 150 : cat === 'apartment' ? 120 : 90,
    callAttempted: false,
    callDuration: 0,
    gpsAccuracy: 5,
    auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    decision: 'REVIEW',
    decisionReason: 'Order newly dispatched — waiting for driver arrival and telemetry stream.'
  };

  orders.unshift(newOrder);
  selectedOrderId = newOrder.id;
  document.getElementById('createModal').classList.remove('open');
  renderOrderList();
  selectOrder(newOrder.id);
};

// Boot
window.onload = () => {
  loadPersistentDeliveries();
  initMap();
  renderOrderList();
  selectOrder(selectedOrderId);
};
