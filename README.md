# Saboot (सपूत / ثبوت) — Zero-Trust Delivery Attempt Verification & Anti-Fraud Platform

> **Cryptographic, telemetry-driven proof of delivery attempt for last-mile logistics.** Eliminates fake customer-unavailable claims, protects driver compensation, and provides indisputable delivery audits.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Expo: SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native: 0.86](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB.svg?logo=react)](https://reactnative.dev/)
[![TypeScript: 7.0](https://img.shields.io/badge/TypeScript-7.0.2-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Maps: Overture / OpenFreeMap](https://img.shields.io/badge/Maps-Overture%20%2F%20OpenFreeMap-10B981.svg)](https://overturemaps.org/)
[![Tests: 41 Passing](https://img.shields.io/badge/Tests-41%20Passed-brightgreen.svg)](#testing--verification)

---

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
  - [The Last-Mile "Ghost Attempt" Problem](#the-last-mile-ghost-attempt-problem)
  - [The Saboot Solution](#the-saboot-solution)
- [2. System Architecture](#2-system-architecture)
  - [High-Level Architectural Diagram](#high-level-architectural-diagram)
  - [Zero-Trust Policy Evaluation Matrix](#zero-trust-policy-evaluation-matrix)
- [3. Key Features](#3-key-features)
- [4. Implementation Status](#4-implementation-status)
- [5. Technology Stack](#5-technology-stack)
- [6. Directory Structure](#6-directory-structure)
- [7. Quickstart & Local Setup](#7-quickstart--local-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Admin Operations Console](#running-the-admin-operations-console)
  - [Running the Mobile Driver App](#running-the-mobile-driver-app)
- [8. Real-Time Sync & REST API Reference](#8-real-time-sync--rest-api-reference)
- [9. Anti-Tampering & Telemetry Math](#9-anti-tampering--telemetry-math)
  - [Haversine Proximity Verification](#haversine-proximity-verification)
  - [Residence-Aware Dwell Thresholds](#residence-aware-dwell-thresholds)
  - [Native Telephony Duration Auditing](#native-telephony-duration-auditing)
  - [Video Anti-Spoofing & Luminance Engine](#video-anti-spoofing--luminance-engine)
- [10. Testing & Verification](#10-testing--verification)
- [11. Permissions & Native Manifests](#11-permissions--native-manifests)
- [12. Roadmap](#12-roadmap)
- [13. Contributing & License](#13-contributing--license)

---

## 1. Executive Summary

### The Last-Mile "Ghost Attempt" Problem
In high-density urban logistics (e.g., Bengaluru, Mumbai, Delhi), 15% to 28% of parcel delivery exceptions are logged as **"Customer Unavailable"**, **"Door Locked"**, or **"Address Incomplete"**. 

Historically, dispatch operations have relied on **blind trust** in mobile client checkboxes. This creates massive operational leaks:
1. **Ghost Attempts**: Drivers stranded in traffic or running behind schedule mark packages as "attempted" while miles away from the recipient address.
2. **Fly-By Scans**: Drivers park at a highway or complex entrance, mark 5 orders unavailable within 30 seconds without ever entering the premises or ringing doorbells.
3. **Ghost Calls**: Drivers click "Call Customer" in an app, immediately hang up (< 2 seconds), and claim the customer did not answer.
4. **Blank Video / Black Lens Tampering**: Drivers cover their smartphone camera with a thumb or record dark pockets to fake video evidence requirements.
5. **Customer Friction & Return-to-Origin (RTO) Costs**: Retailers absorb millions in return freight, restocking fees, and angry customer escalations.

### The Saboot Solution
**Saboot** (*Hindi for "Proof / Irrefutable Evidence"*) replaces subjective driver claims with a **deterministic zero-trust evaluation engine**. The mobile client never decides if an attempt is valid; it submits raw sensory telemetry (GPS breadcrumbs, horizontal dilution of precision, OS call timestamps, pixel luminance arrays, and video clips) to an immutable policy engine.

Every delivery attempt resolves deterministically into one of four states:
- `VERIFIED`: Mandatory proximity (≤ 50m), residence-specific dwell time (90s–150s), and verified telephony contact criteria met.
- `REJECTED`: Falsified attempts (e.g., driver > 500m away, zero call made, covered camera lens).
- `REVIEW`: Ambiguous edge cases (e.g., degraded GPS accuracy ±68m, borderline dwell time) flagged for supervisor inspection.
- `DELIVERED`: Authentic customer doorstep handoff verified by anti-spoof video recording and persisted to local SQLite / backend storage.

---

## 2. System Architecture

### High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph MobileDriverApp["Mobile Driver App (Expo SDK 57 / React Native)"]
        Sensors["Device Telemetry\n(GPS Breadcrumbs, Gyro, Acc)"] --> LocServ["Location Service\n(Haversine Engine)"]
        Dialer["Native Phone Dialer\n(AppFocus / OS Timer)"] --> TelServ["Telephony Auditor\n(Ring Duration Engine)"]
        Cam["Expo Camera / Document Picker\n(In-App Viewfinder / Native Camera)"] --> VidEng["Video Anti-Spoof Engine\n(ITU-R BT.601 Luminance)"]
        
        LocServ --> AttestHook["useAttestation / useDelivery Hooks"]
        TelServ --> AttestHook
        VidEng --> AttestHook
        
        AttestHook --> SQLite["Local Storage\n(expo-sqlite WAL / Web Storage)"]
        AttestHook --> SyncClient["realtimeSync Service\n(HTTP REST + SSE Client)"]
    end

    subgraph SyncServer["Saboot Sync & Backend Engine (Node.js :3000)"]
        APIGateway["REST API Endpoints\n(/api/deliveries, /api/events)"]
        SSEHub["Server-Sent Events Stream\n(/api/events - Broadcast Hub)"]
        PollHub["Polling Fallback\n(/api/events/poll)"]
        PolicyEngine["Deterministic Zero-Trust Engine\n(Proximity, Dwell, Telemetry Checks)"]
        DiskStore["JSON File Store\n(admin/data/deliveries.json)"]
        
        APIGateway --> PolicyEngine
        APIGateway --> DiskStore
        APIGateway --> SSEHub
        APIGateway --> PollHub
    end

    subgraph AdminConsole["Admin Operations & Dispatch Console (Web)"]
        AdminUI["Leaflet + Overture Foundation Maps\n(Dark / Silver Tile HUD)"]
        OrderQueue["20-Task Live Route Queue\n(KPI Cards: Stops, Verified, Rejected)"]
        VideoHUD["Interactive Video Evidence Player\n(Canvas Scrubbing + Telemetry Overlays)"]
        SupervisorActions["Admin Controls\n(Approve / Reject / Reassign Driver)"]
        
        AdminUI <--> OrderQueue
        OrderQueue --> VideoHUD
        VideoHUD --> SupervisorActions
    end

    SyncClient <-->|Bi-Directional Sync\n(10s Auto-Ping + SSE)| APIGateway
    AdminConsole <-->|SSE Stream & HTTP Updates\n(10s Heartbeat)| APIGateway
```

### Zero-Trust Policy Evaluation Matrix

```mermaid
flowchart LR
    Start([Raw Attempt Payload]) --> ProxCheck{Driver within 50m?}
    ProxCheck -- No (> 500m) --> FailReject[REJECTED: Remote Attempt]
    ProxCheck -- Yes / Borderline --> DwellCheck{Dwell Time Satisfied?\n(90s House / 120s Apt / 150s Gated)}
    
    DwellCheck -- No & No Call --> FailReject2[REJECTED: No Dwell & No Call]
    DwellCheck -- Insufficient Dwell --> ReviewDwell[REVIEW: Borderline Dwell]
    
    DwellCheck -- Yes --> CallCheck{Call Attempt Verified?\n(Ring Time ≥ 8s)}
    CallCheck -- No --> ReviewCall[REVIEW: Unverified Telephony]
    
    CallCheck -- Yes --> GPSCheck{GPS Accuracy ≤ 30m?}
    GPSCheck -- No (±68m) --> ReviewGPS[REVIEW: Degraded Telemetry]
    GPSCheck -- Yes --> VideoCheck{Video Proof Required?}
    
    VideoCheck -- Yes (Customer Absent) --> VidEval{Video Anti-Spoof Pass?\n(Luminance > 18, Var > 8)}
    VidEval -- Fail (Covered Lens) --> FailRejectVid[REJECTED: Black / Fake Video]
    VidEval -- Pass --> SupervisorQueue[REVIEW: Pending Admin Approval]
    
    VideoCheck -- No (Direct Handoff) --> PassVerified[VERIFIED / DELIVERED]
```

---

## 3. Key Features

### 🛡️ Zero-Trust Attempt Verification
- **Automated Geofence Lock**: Evaluates spherical distance to delivery coordinates using Haversine calculation. Flagged if attempt occurs outside the 50m perimeter.
- **Categorical Dwell Times**: Dwell duration is not one-size-fits-all:
  - *Individual Houses*: 90 seconds.
  - *Apartment Buildings*: 120 seconds.
  - *Gated Societies & Tech Parks*: 150 seconds (accounts for security gate clearance and elevator travel).
- **Native Telephony Duration Auditing**: Integrates with OS app focus lifecycles (`AppState` / window focus) to measure actual time spent in the system dialer. Prevents instant-hangup spoofing by requiring ring durations ≥ 8s.

### 🎥 Video Proof & Anti-Spoofing Engine
- **In-App Camera Viewfinder**: Pre-warmed viewfinder with high-visibility countdown overlays.
- **Native OS Camera & System File Picker**: Supports direct document picker uploads, Android/iOS native camera intents, and desktop drag-and-drop file choices.
- **Pixel Luminance & Variance Analysis (ITU-R BT.601)**:
  - Detects covered lens / pocket recordings (`meanLuminance < 18`).
  - Detects overexposed blank ceilings / paper sheets (`meanLuminance > 240` with `stdDev < 12`).
  - Detects solid-color fake recordings (`variance < 8`).
  - Rejects video files shorter than 2.0 seconds.
- **Cryptographic Audit Signatures**: Embeds frame-level metadata overlays (timestamp, GPS accuracy, luminance score, SHA-256 hash preview).

### 🗺️ Open-Source Overture & Leaflet Maps
- **Complete Google Maps Replacement**: Powered by open-source Overture Maps Foundation tiles via OpenFreeMap / Carto Positron.
- **High-Contrast Telemetry Theme**: Sleek dark/silver slate aesthetics designed for operations room monitors and low-light delivery driving.
- **Live Delivery Radar**: Real-time driver pin markers, customer geofence circles (50m), breadcrumb trails, and dynamic distance calculations.

### ⚡ 10-Second Auto-Ping & Real-Time Sync
- **Continuous Bidirectional Heartbeat**: Both the Mobile App and the Admin Operations Portal execute an automated 10-second background ping loop (`setInterval`).
- **Zero-Latency Dispatch**: Newly created or reassigned tasks in the Admin console are dispatched immediately over Server-Sent Events (SSE) and reflected on driver devices.
- **Incremental SQLite Seeding**: On application boot, missing deliveries are merged into SQLite via `INSERT OR IGNORE` without wiping or resetting already-completed deliveries.

---

## 4. Implementation Status

| Capability / Component | Status | Verification Detail |
|---|:---:|---|
| **Haversine Distance Engine** | ✅ Implemented | Tested against close (31m) and remote (3168m) coordinates in `tests/runTests.js`. |
| **Categorical Dwell Calculation** | ✅ Implemented | Validates dwell times from raw breadcrumbs across 90s, 120s, and 150s thresholds. |
| **Native Call-Log Time Tracker** | ✅ Implemented | Tracks elapsed dialer time via `AppState` and window blur/focus events; flags calls < 8s. |
| **Video Anti-Spoofing Analysis** | ✅ Implemented | Evaluates luminance, variance, standard deviation, and duration in `videoVerificationService.ts`. |
| **Mobile Camera & File Picker** | ✅ Implemented | Supports `expo-camera`, `expo-image-picker`, and `expo-document-picker` with Web file input fallback. |
| **Overture Maps Integration** | ✅ Implemented | 100% open-source Leaflet + Overture Foundation tiles in `admin/app.js` and `LiveDeliveryMap.tsx`. |
| **Admin Operations Dashboard** | ✅ Implemented | Full dispatch queue, KPI counters, map tracking, and video playback in `admin/index.html`. |
| **Bidirectional Sync Server** | ✅ Implemented | Native Node.js HTTP + SSE server on port 3000 (`admin/server.js`) binding `0.0.0.0`. |
| **Continuous 10s Auto-Ping** | ✅ Implemented | 10s polling interval in `useDelivery.ts` and `admin/app.js` with live UI badges. |
| **SQLite WAL Persistence** | ✅ Implemented | Relational schema in `expo-sqlite` (Expo SDK 57) with localStorage fallback on Web. |
| **Pre-Populated Task Dataset** | ✅ Implemented | 20 realistic delivery stops (`DEL-1001` through `DEL-1020`) across Bengaluru. |
| **Hardware Bluetooth Beacon Lock** | 📋 Planned | Reserved for future warehouse cage and locker gate pairing. |

---

## 5. Technology Stack

### Mobile Client Application
- **Runtime**: [React Native 0.86.3](https://reactnative.dev/) with [React 19.2.3](https://react.dev/)
- **Framework**: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- **Language**: [TypeScript 7.0.2](https://www.typescriptlang.org/)
- **Persistence**: `expo-sqlite` (WAL Mode) with Web `localStorage` abstraction
- **Sensors & Media**: `expo-location`, `expo-camera`, `expo-image-picker`, `expo-document-picker`, `expo-haptics`
- **Mapping**: `react-native-maps` (Mobile Native) & HTML5 Canvas / Leaflet (Web)

### Admin Operations Console & Backend Sync
- **Backend Runtime**: Node.js core HTTP (`admin/server.js`) with zero external runtime dependencies
- **Real-Time Protocol**: Server-Sent Events (SSE `text/event-stream`) + REST HTTP Polling fallback
- **GIS / Mapping**: Leaflet 1.9.4 with Overture Maps Foundation / OpenFreeMap vector tiles
- **Frontend Architecture**: Vanilla ES6+ JavaScript, CSS3 custom design tokens, and HTML5 Canvas video simulation

---

## 6. Directory Structure

```
Saboot/
├── admin/                           # Admin Operations Console & Sync Server
│   ├── data/
│   │   └── deliveries.json          # Persisted backend delivery records
│   ├── app.js                       # Admin UI logic, Leaflet map, video player
│   ├── index.html                   # Operations console markup & KPI cards
│   ├── server.js                    # Node.js HTTP + SSE sync server (Port 3000)
│   └── style.css                    # High-contrast silver/slate operations theme
├── assets/                          # Application icons, splash screens, logos
├── src/
│   ├── App.tsx                      # Root screen orchestrator & navigation state
│   ├── components/                  # Reusable UI components
│   │   ├── DeliveryCard.tsx         # Delivery queue card with status chips
│   │   ├── DwellGauge.tsx           # Circular dwell time countdown timer
│   │   ├── EvidenceChecklist.tsx    # Step-by-step physical verification checklist
│   │   ├── Header.tsx               # Top header with driver profile
│   │   ├── LiveDeliveryMap.tsx      # Interactive map with geofence & driver radar
│   │   ├── MetricCard.tsx           # Shift KPI summary cards
│   │   ├── ResultCard.tsx           # Post-verification audit certificate card
│   │   ├── SabootLogo.tsx           # Vector shield branding
│   │   └── ScenarioModal.tsx        # Hackathon demo scenario switcher
│   ├── constants/
│   │   ├── demoData.ts              # 20 complete Bengaluru deliveries (DEL-1001..DEL-1020)
│   │   ├── dwellPolicy.ts           # Residence-specific dwell & proximity limits
│   │   └── theme.ts                 # Color tokens, typography, shadows
│   ├── hooks/
│   │   ├── useAttestation.ts        # Attempt verification workflow hook
│   │   ├── useDelivery.ts           # SQLite sync, 10s ping, and shift metrics hook
│   │   └── useLocationTracking.ts   # GPS breadcrumb recording & Haversine calculator
│   ├── screens/
│   │   ├── DeliveryDetailScreen.tsx # Handoff workflow, camera, call log, file picker
│   │   ├── HomeScreen.tsx           # Route stops list, KPI counters, sync button
│   │   └── ResultScreen.tsx         # Detailed verification audit report
│   ├── services/
│   │   ├── apiService.ts            # Zero-trust deterministic policy evaluation engine
│   │   ├── databaseService.ts       # expo-sqlite WAL database & Web storage adapter
│   │   ├── locationService.ts       # GPS watchPosition & Haversine distance math
│   │   ├── realtimeSync.ts          # REST + SSE client and event bus
│   │   └── videoVerificationService.ts # Video frame analysis & anti-tamper checker
│   └── types/
│       ├── delivery.ts              # Delivery, Address, Customer, ShiftMetrics types
│       ├── evidence.ts              # GPS breadcrumb, CallEvidence, VideoEvidence types
│       └── policy.ts                # VerificationResult, VerificationFacts types
├── tests/                           # Verification & test suites
│   ├── runTests.js                  # Zero-trust policy & spoofing test suite (21 tests)
│   ├── testAdminAndFileManager.js   # Admin controls & file upload tests (4 tests)
│   ├── testOvertureAndDispatchSync.js # Overture maps & dispatch sync tests (7 tests)
│   ├── testVideoAndSqlite.js        # Video anti-spoof & SQLite tests (9 tests)
│   └── verifyAllFeatures.js         # End-to-end integration test runner
├── app.json                         # Expo configuration, plugins & OS permissions
├── package.json                     # Scripts and dependencies
└── tsconfig.json                    # TypeScript compiler configuration
```

---

## 7. Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v18.x` or higher (tested on Node v20/v22)
- **npm** or **yarn**
- **Expo Go** (if running on a physical Android or iOS device)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/vishnubhargavd/Saboot.git
cd Saboot
npm install
```

### Running the Admin Operations Console
Start the sync server and operations dashboard:

```bash
npm run admin
```

The console will bind to all network interfaces (`0.0.0.0:3000`):
- **Local Web Console**: [http://localhost:3000](http://localhost:3000)
- **REST API Deliveries**: [http://localhost:3000/api/deliveries](http://localhost:3000/api/deliveries)
- **Real-Time SSE Stream**: [http://localhost:3000/api/events](http://localhost:3000/api/events)

### Running the Mobile Driver App
In a separate terminal window, start the Expo development server:

```bash
# Start Expo interactive CLI
npm start

# Or run directly in your desktop browser:
npm run web

# Or target a connected Android device / emulator:
npm run android

# Or target an iOS simulator (macOS required):
npm run ios
```

> **LAN Mobile Device Note**: When running on a physical mobile device via Expo Go, ensure your phone and computer are on the same Wi-Fi network. The app automatically detects your computer's LAN IP via Expo's `scriptURL` and connects to `http://<YOUR-IP>:3000`.

---

## 8. Real-Time Sync & REST API Reference

The Saboot sync engine provides standard REST endpoints and a Server-Sent Events (SSE) broadcast stream.

### Endpoints

#### `GET /api/deliveries`
Returns the complete list of delivery tasks in the active dispatch route.
```http
GET /api/deliveries HTTP/1.1
Host: localhost:3000
```
**Response (200 OK)**:
```json
[
  {
    "id": "DEL-1001",
    "trackingNumber": "SBT-BLR-882190",
    "customer": { "name": "Vishnu Bhargav", "phone": "+91 90191 44983" },
    "address": { "street": "Tower 4, Flat 902, Sobha Silicon Oasis", "latitude": 12.8715, "longitude": 77.6534 },
    "status": "IN_TRANSIT",
    "assignedDriverId": "DRV-BLR-09"
  }
]
```

#### `POST /api/deliveries`
Dispatches a new delivery task to the route. Broadcasts an `ORDER_DISPATCHED` event to all driver apps.
```http
POST /api/deliveries HTTP/1.1
Content-Type: application/json

{
  "customerName": "Ananya Roy",
  "customerPhone": "+91 98450 11223",
  "street": "100 Feet Road, Indiranagar",
  "residenceCategory": "apartment",
  "latitude": 12.9784,
  "longitude": 77.6408,
  "packageDescription": "Consumer Electronics",
  "assignedDriverId": "DRV-BLR-09"
}
```

#### `PUT /api/deliveries/:id`
Updates an existing delivery record (e.g. driver reassignment, handoff completion, or supervisor review).
```http
PUT /api/deliveries/DEL-1001 HTTP/1.1
Content-Type: application/json

{
  "status": "VERIFIED",
  "notes": "Handoff verified by supervisor audit.",
  "adminApprovalStatus": "APPROVED"
}
```

#### `GET /api/events` (SSE Stream)
Opens a persistent Server-Sent Events connection. Emits real-time JSON events:
- `ORDER_DISPATCHED`: New order created in admin console.
- `TASK_ASSIGNED`: Driver reassigned.
- `DELIVERY_COMPLETED`: Driver completed handoff with video proof.
- `ADMIN_DECISION_UPDATED`: Supervisor approved or rejected claim.

#### `GET /api/events/poll?since=<TIMESTAMP>`
Lightweight polling fallback for network environments where long-lived HTTP SSE connections are interrupted.

#### `GET /api/health`
Health check returning server uptime and loaded delivery record count.

---

## 9. Anti-Tampering & Telemetry Math

### Haversine Proximity Verification
To determine distance between the driver's current coordinates $(\phi_1, \lambda_1)$ and the delivery address $(\phi_2, \lambda_2)$, Saboot uses the great-circle Haversine formula on a spherical Earth radius $R = 6,371,000\text{ m}$:

$$\Delta\phi = \frac{(\phi_2 - \phi_1) \cdot \pi}{180}, \quad \Delta\lambda = \frac{(\lambda_2 - \lambda_1) \cdot \pi}{180}$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\left(\frac{\phi_1 \cdot \pi}{180}\right) \cdot \cos\left(\frac{\phi_2 \cdot \pi}{180}\right) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right), \quad d = R \cdot c$$

Attempts with $d > 50\text{m}$ (plus GPS jitter tolerance) are blocked from claiming proximity verification.

### Residence-Aware Dwell Thresholds
Dwell time is derived from the timestamps of consecutive breadcrumbs recorded within the $50\text{m}$ geofence:

$$T_{\text{dwell}} = t_{\text{last\_inside}} - t_{\text{first\_inside}}$$

| Residence Category | Minimum Dwell ($T_{\text{dwell}}$) | Operational Rationale |
|---|:---:|---|
| **Individual House** | 90 seconds | Front-gate entry, doorbell ring, waiting at doorstep |
| **Apartment Complex** | 120 seconds | Parking, building intercom, elevator transit |
| **Gated Society / Tech Park** | 150 seconds | Visitor gate register, security guard check, tower navigation |

### Native Telephony Duration Auditing
When the driver taps "Call Customer", the app launches the OS dialer via `tel:` and captures the exact timestamp $T_{\text{dial}}$. When the driver returns to the app (monitored by React Native `AppState` and Web window focus), the return timestamp $T_{\text{return}}$ is recorded:

$$\Delta T_{\text{call}} = T_{\text{return}} - T_{\text{dial}}$$

- $\Delta T_{\text{call}} < 3\text{s}$: Classified as **Canceled / Misclick** (driver never dialed).
- $3\text{s} \le \Delta T_{\text{call}} < 8\text{s}$: Classified as **Premature Hangup** (insufficient ring count, rejected).
- $\Delta T_{\text{call}} \ge 8\text{s}$: Accepted as **Valid Attempt** (`no_answer`, `busy`, or `completed`).

### Video Anti-Spoofing & Luminance Engine
To verify that video evidence contains genuine visual data rather than a covered lens or blank screen, frames are analyzed using the **ITU-R BT.601** perceived luminance formula across sampled pixels:

$$Y_i = 0.299 \cdot R_i + 0.587 \cdot G_i + 0.114 \cdot B_i$$

$$\bar{Y} = \frac{1}{N} \sum_{i=1}^N Y_i, \quad \sigma^2 = \frac{1}{N} \sum_{i=1}^N (Y_i - \bar{Y})^2, \quad \sigma = \sqrt{\sigma^2}$$

- **Covered Lens / Dark Pocket**: $\bar{Y} < 18 \implies \text{REJECTED\_BLACK}$
- **Washed Out / Blank Light**: $\bar{Y} > 240 \text{ and } \sigma < 12 \implies \text{REJECTED\_WHITE}$
- **Static Monochromatic Dummy**: $\sigma < 8 \implies \text{REJECTED\_BLANK}$
- **Duration Check**: $T_{\text{video}} < 2.0\text{s} \implies \text{REJECTED\_TOO\_SHORT}$

---

## 10. Testing & Verification

Saboot includes **41 automated tests** across 5 standalone test suites covering telemetry math, zero-trust policy rules, anti-tampering guards, video spoof detection, SQLite persistence, and dispatch synchronization.

### Run All Test Suites

```bash
# 1. Zero-Trust Policy & Hackathon Scenarios Suite (21 tests)
node tests/runTests.js

# 2. Video Proof Anti-Spoofing & SQLite Metrics Suite (9 tests)
node tests/testVideoAndSqlite.js

# 3. File Manager & Admin Controls Suite (4 tests)
node tests/testAdminAndFileManager.js

# 4. Overture Maps & Dispatch Real-Time Sync Suite (7 tests)
node tests/testOvertureAndDispatchSync.js

# 5. End-to-End Comprehensive Feature Verification
node tests/verifyAllFeatures.js
```

### TypeScript & Syntax Verification
```bash
# Type check the mobile application (0 errors)
npx tsc --noEmit --skipLibCheck

# Syntax check backend servers
node -c admin/server.js && node -c admin/app.js
```

---

## 11. Permissions & Native Manifests

Saboot requests zero unnecessary permissions. All native permissions declared in `app.json` are strictly tied to delivery attempt evidence:

```json
{
  "android": {
    "permissions": [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "RECORD_AUDIO"
    ]
  },
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "Saboot requires your location to verify delivery proximity and dwell time.",
      "NSCameraUsageDescription": "Saboot uses the camera for customer-consented delivery proof video.",
      "NSMicrophoneUsageDescription": "Saboot uses the microphone for video evidence recording."
    }
  }
}
```

---

## 12. Roadmap

- [x] **Phase 1: Core Zero-Trust Telemetry Engine**: Haversine distance, categorical dwell thresholds, and native telephony audit.
- [x] **Phase 2: Video Anti-Spoofing & Handoff Proof**: ITU-R BT.601 pixel analysis, covered lens detection, and high-res thumbnail generator.
- [x] **Phase 3: Open-Source Maps Migration**: Migration from Google Maps to Leaflet and Overture Maps Foundation tiles.
- [x] **Phase 4: Real-Time Sync & 10s Auto-Ping**: Bi-directional HTTP REST + Server-Sent Events with automated 10-second heartbeat.
- [x] **Phase 5: 20-Stop Bengaluru Route Catalog**: Rich demo dataset with realistic addresses, geofences, and package types.
- [ ] **Phase 6: Cryptographic Ble Beacon Lock**: Secure handshake with apartment locker gates and building access beacons.
- [ ] **Phase 7: Hardware-Attested KeyStore (Keystore/SecureEnclave)**: Cryptographically sign GPS breadcrumbs with device-bound private keys.

---

## 13. Contributing & License

Contributions are welcome! Please ensure all modifications pass TypeScript checks (`npx tsc --noEmit --skipLibCheck`) and the full test suite (`node tests/runTests.js && node tests/verifyAllFeatures.js`) before opening a pull request.

### License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
