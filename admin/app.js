// Saboot Admin Operations Console Logic

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
    distanceMeters: 45,
    dwellSeconds: 152,
    requiredDwellSeconds: 120,
    callAttempted: true,
    callDuration: 3,
    gpsAccuracy: 68,
    auditId: 'AUD-9M32-P18Q',
    decision: 'REVIEW',
    decisionReason: 'Sent to Ops Review: Degraded GPS uncertainty (±68m) and short call duration (3s) requires confirmation.'
  },
  {
    id: 'DEL-1004',
    trackingNumber: 'SBT-BLR-882193',
    customer: { name: 'Manoj Hegde', phone: '+91 98860 33119' },
    address: { street: '14th Main, 7th Sector, HSR Layout', city: 'Bengaluru', residenceCategory: 'gated_society', lat: 12.9116, lng: 77.6389 },
    packageDescription: 'Medicine / Perishables — Cold Storage Pack',
    driver: 'DRV-BLR-15 (Unit 15)',
    status: 'ASSIGNED',
    distanceMeters: 48,
    dwellSeconds: 110,
    requiredDwellSeconds: 150,
    callAttempted: true,
    callDuration: 18,
    gpsAccuracy: 10,
    auditId: 'AUD-4L19-V88Z',
    decision: 'REVIEW',
    decisionReason: 'Driver departed after 110s (below mandatory 150s gated society dwell window).'
  }
];

let orders = [...INITIAL_ORDERS];
let selectedOrderId = orders[0].id;
let map, geofenceCircle, routePolyline, customerMarker, truckMarker;

// Initialize Leaflet Map
function initMap() {
  const defaultOrder = orders[0];
  map = L.map('adminMap', { zoomControl: true }).setView([defaultOrder.address.lat, defaultOrder.address.lng], 16);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    opacity: 0.9
  }).addTo(map);

  renderSelectedOrderMap(defaultOrder);
}

function renderSelectedOrderMap(order) {
  if (geofenceCircle) map.removeLayer(geofenceCircle);
  if (routePolyline) map.removeLayer(routePolyline);
  if (customerMarker) map.removeLayer(customerMarker);
  if (truckMarker) map.removeLayer(truckMarker);

  const dest = [order.address.lat, order.address.lng];
  const driverOffsetLat = order.distanceMeters > 500 ? dest[0] + 0.025 : dest[0] + 0.0003;
  const driverOffsetLng = order.distanceMeters > 500 ? dest[1] + 0.025 : dest[1] + 0.0003;
  const driverPos = [driverOffsetLat, driverOffsetLng];

  // 50m Geofence Circle
  geofenceCircle = L.circle(dest, {
    color: '#D94A27',
    fillColor: '#D94A27',
    fillOpacity: order.distanceMeters <= 50 ? 0.15 : 0.05,
    weight: 2.5,
    dashArray: '5, 5',
    radius: 50
  }).addTo(map);

  // Route Polyline
  routePolyline = L.polyline([driverPos, dest], {
    color: '#D94A27',
    weight: 3,
    dashArray: '4, 6',
    opacity: 0.8
  }).addTo(map);

  // Markers
  const custIcon = L.divIcon({
    className: 'custom-pin',
    html: '<div style="background:#D94A27; color:#fff; width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg); font-size:14px;">📍</span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
  customerMarker = L.marker(dest, { icon: custIcon }).addTo(map);

  const truckIcon = L.divIcon({
    className: 'truck-pin',
    html: '<div style="background:#334454; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #fff; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🚚</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  truckMarker = L.marker(driverPos, { icon: truckIcon }).addTo(map);

  map.fitBounds(L.latLngBounds([dest, driverPos]), { padding: [50, 50], maxZoom: 17 });
}

// Render Order List & Sidebar
function renderOrderList() {
  const container = document.getElementById('orderList');
  container.innerHTML = '';

  orders.forEach((order) => {
    const isSelected = order.id === selectedOrderId;
    const card = document.createElement('div');
    card.className = `order-card ${isSelected ? 'active' : ''}`;
    card.onclick = () => selectOrder(order.id);

    const badgeClass = order.status.toLowerCase();

    card.innerHTML = `
      <div class="order-top">
        <span class="order-tracking">${order.trackingNumber}</span>
        <span class="status-badge ${badgeClass}">${order.status}</span>
      </div>
      <div class="order-name">${order.customer.name}</div>
      <div class="order-address">${order.address.street}</div>
      <div class="order-meta">
        <span>${order.address.residenceCategory.toUpperCase()} (${order.requiredDwellSeconds}s)</span>
        <span>${order.driver.split(' ')[0]}</span>
      </div>
    `;
    container.appendChild(card);
  });

  updateKPICounters();
}

function updateKPICounters() {
  document.getElementById('kpiTotal').innerText = orders.length;
  document.getElementById('queueCount').innerText = `${orders.length} Packages`;
  document.getElementById('kpiVerified').innerText = orders.filter((o) => o.status === 'VERIFIED').length;
  document.getElementById('kpiRejected').innerText = orders.filter((o) => o.status === 'REJECTED').length;
  document.getElementById('kpiReview').innerText = orders.filter((o) => o.status === 'REVIEW').length;
}

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

  // Update Inspector Card
  const badge = document.getElementById('inspectorDecisionBadge');
  const title = document.getElementById('inspectorDecisionTitle');
  const sub = document.getElementById('inspectorDecisionSub');

  if (order.status === 'VERIFIED') {
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
    title.innerText = 'SENT TO OPS REVIEW';
    sub.innerText = order.decisionReason;
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
  initMap();
  renderOrderList();
  selectOrder(selectedOrderId);
};
