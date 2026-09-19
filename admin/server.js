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
      saveDeliveries();
    }
  } else {
    deliveries = [...DEFAULT_DELIVERIES];
    saveDeliveries();
  }
} catch (e) {
  deliveries = [...DEFAULT_DELIVERIES];
}

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

// MIME Types for Admin static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
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

  // 3. Post Event
  if (pathname === '/api/events' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
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
        const order = deliveries.find((d) => d.id === id);
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
          : updates.status === 'VERIFIED' || updates.status === 'REJECTED' || updates.adminApprovalStatus
          ? 'ADMIN_DECISION_UPDATED'
          : 'ORDER_UPDATED';

        broadcastEvent({
          type: eventType,
          deliveryId: id,
          status: order.status,
          notes: updates.notes || `Task ${id} updated`,
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
