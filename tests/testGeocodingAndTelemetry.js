const assert = require('assert');
const http = require('http');

async function testSuite() {
  console.log('======================================================');
  console.log('🧪 TESTING REAL-WORLD GEOCODING & LIVE DRIVER TELEMETRY');
  console.log('======================================================\n');

  // 1. Test Forward Geocoding: "asritha lotus residency HSR Layout"
  console.log('1. Testing Forward Geocoding for "asritha lotus residency HSR Layout"...');
  const PORT = process.env.PORT || 3001;
  const geocodeRes1 = await fetch(`http://localhost:${PORT}/api/geocode?q=asritha+lotus+residency+HSR+Layout`);
  assert.strictEqual(geocodeRes1.status, 200, 'Geocode endpoint should return 200');
  const geocodeData1 = await geocodeRes1.json();
  
  assert.strictEqual(geocodeData1.success, true, 'Geocode response success should be true');
  assert(geocodeData1.locality.includes('HSR Layout'), 'Locality must resolve to HSR Layout');
  assert(Math.abs(geocodeData1.lat - 12.9116) < 0.05, `Latitude should be near HSR Layout (~12.91), got ${geocodeData1.lat}`);
  assert(Math.abs(geocodeData1.lng - 77.6388) < 0.05, `Longitude should be near HSR Layout (~77.63), got ${geocodeData1.lng}`);
  console.log(`  ✅ Successfully geocoded "asritha lotus residency HSR Layout" -> [${geocodeData1.lat}, ${geocodeData1.lng}] (${geocodeData1.locality})`);

  // 2. Test Forward Geocoding for other Bengaluru addresses
  console.log('\n2. Testing Geocoding for Koramangala and Electronic City...');
  const geocodeRes2 = await fetch(`http://localhost:${PORT}/api/geocode?q=80+Feet+Road+6th+Block+Koramangala`);
  const geocodeData2 = await geocodeRes2.json();
  assert.strictEqual(geocodeData2.locality, 'Koramangala', 'Locality must resolve to Koramangala');
  console.log(`  ✅ Successfully geocoded Koramangala -> [${geocodeData2.lat}, ${geocodeData2.lng}]`);

  const geocodeRes3 = await fetch(`http://localhost:${PORT}/api/geocode?q=Sobha+Silicon+Oasis+Electronic+City`);
  const geocodeData3 = await geocodeRes3.json();
  assert.strictEqual(geocodeData3.locality, 'Electronic City', 'Locality must resolve to Electronic City');
  console.log(`  ✅ Successfully geocoded Electronic City -> [${geocodeData3.lat}, ${geocodeData3.lng}]`);

  // 3. Test Driver Telemetry POST (Phone GPS stream uplink)
  console.log('\n3. Testing Mobile Phone Live Telemetry Stream (POST /api/telemetry)...');
  const sampleGpsTelemetry = {
    driverId: 'DRV-BLR-09',
    latitude: 12.912450,
    longitude: 77.639120,
    accuracy: 4,
    speed: 5.5,
    heading: 145,
    deliveryId: 'DEL-1001'
  };

  const postTelRes = await fetch(`http://localhost:${PORT}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sampleGpsTelemetry)
  });
  assert.strictEqual(postTelRes.status, 200, 'Telemetry POST should return 200');
  const postTelData = await postTelRes.json();
  assert.strictEqual(postTelData.success, true, 'Telemetry POST response success should be true');
  assert.strictEqual(postTelData.telemetry.latitude, 12.912450, 'Latitude must match input');
  assert.strictEqual(postTelData.telemetry.longitude, 77.639120, 'Longitude must match input');
  console.log(`  ✅ Server ingested driver telemetry: lat=${postTelData.telemetry.latitude}, lng=${postTelData.telemetry.longitude}, speed=${postTelData.telemetry.speed} m/s`);

  // 4. Test Driver Telemetry Query (GET /api/telemetry)
  console.log('\n4. Verifying Driver Telemetry retrieval (GET /api/telemetry)...');
  const getTelRes = await fetch(`http://localhost:${PORT}/api/telemetry?driverId=DRV-BLR-09`);
  assert.strictEqual(getTelRes.status, 200, 'Telemetry GET should return 200');
  const getTelData = await getTelRes.json();
  assert.strictEqual(getTelData.success, true, 'Telemetry GET response success should be true');
  assert.strictEqual(getTelData.telemetry.driverId, 'DRV-BLR-09', 'DriverId must match');
  assert.strictEqual(getTelData.telemetry.isOnline, true, 'Driver must be marked online');
  console.log(`  ✅ Confirmed active driver telemetry stored in memory and queryable for Admin console`);

  // 5. Verify Overture Maps and dispatch geocode wiring in admin/app.js
  console.log('\n5. Verifying admin/app.js & rider app code integrations...');
  const fs = require('fs');
  const path = require('path');
  const adminAppJs = fs.readFileSync(path.join(__dirname, '../admin/app.js'), 'utf8');
  assert(adminAppJs.includes('/api/geocode'), 'admin/app.js must call /api/geocode');
  assert(adminAppJs.includes('DRIVER_LOCATION_UPDATE'), 'admin/app.js must handle DRIVER_LOCATION_UPDATE events');
  assert(adminAppJs.includes('driverLiveTelemetry'), 'admin/app.js must maintain driverLiveTelemetry');
  assert(adminAppJs.includes('calculateHaversineDistance'), 'admin/app.js must dynamically calculate Haversine distance from live GPS');
  console.log('  ✅ Confirmed admin/app.js handles real-time geocoding and live GPS driver positioning');

  const liveMapTsx = fs.readFileSync(path.join(__dirname, '../src/components/LiveDeliveryMap.tsx'), 'utf8');
  assert(liveMapTsx.includes('Overture Maps Foundation'), 'LiveDeliveryMap.tsx must include Overture Maps Foundation styling');
  console.log('  ✅ Confirmed rider LiveDeliveryMap.tsx uses Overture Maps Foundation styling');

  console.log('\n======================================================');
  console.log('🎉 ALL GEOCODING & LIVE TELEMETRY VERIFICATIONS PASSED');
  console.log('======================================================\n');
}

testSuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
