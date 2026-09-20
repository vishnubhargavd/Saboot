import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { requestForegroundLocationPermission, getCurrentRawLocation } from '../services/locationService';

interface LiveDeliveryMapProps {
  driverLat: number;
  driverLng: number;
  destLat: number;
  destLng: number;
  destAddress: string;
  distanceMeters: number | null;
  gpsAccuracy: number;
  isInsideGeofence: boolean;
  onBack?: () => void;
  onRecenter?: () => void;
}

export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({
  driverLat,
  driverLng,
  destLat,
  destLng,
  destAddress,
  distanceMeters,
  gpsAccuracy,
  isInsideGeofence,
  onBack,
  onRecenter,
}) => {
  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const mapReadyRef = useRef<boolean>(false);
  const pendingUpdateRef = useRef<{ lat: number; lng: number; isInsideGeofence: boolean } | null>(null);

  // Send position update to the map (only when map is ready)
  const sendPositionUpdate = useCallback((lat: number, lng: number, inside: boolean) => {
    if (!mapReadyRef.current) {
      // Queue the update — will be flushed when map loads
      pendingUpdateRef.current = { lat, lng, isInsideGeofence: inside };
      return;
    }

    if (Platform.OS === 'web') {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            type: 'UPDATE_DRIVER_LOCATION',
            lat,
            lng,
            isInsideGeofence: inside,
          }),
          '*'
        );
      } catch {}
    } else {
      webViewRef.current?.injectJavaScript(
        `if (window.updateDriverPosition) { window.updateDriverPosition(${lat}, ${lng}, ${inside}); } true;`
      );
    }
  }, []);

  // Handle map iframe/webview load — flush any pending position updates
  const handleMapLoaded = useCallback(() => {
    mapReadyRef.current = true;
    // Flush any queued position update that arrived before map was ready
    if (pendingUpdateRef.current) {
      const { lat, lng, isInsideGeofence: inside } = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      // Small delay to ensure JS inside iframe is fully initialized
      setTimeout(() => sendPositionUpdate(lat, lng, inside), 200);
    }
  }, [sendPositionUpdate]);

  // Dispatch real-time coordinate updates to map without reloading
  useEffect(() => {
    sendPositionUpdate(driverLat, driverLng, isInsideGeofence);
  }, [driverLat, driverLng, isInsideGeofence, sendPositionUpdate]);

  // Request location permission & recenter map properly
  const handleLocateAndRecenter = async () => {
    try {
      const perm = await requestForegroundLocationPermission();
      let activeLat = driverLat;
      let activeLng = driverLng;

      if (perm.granted) {
        const fresh = await getCurrentRawLocation();
        if (fresh) {
          activeLat = fresh.latitude;
          activeLng = fresh.longitude;
        }
      }

      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            type: 'RECENTER_MAP',
            driverLat: activeLat,
            driverLng: activeLng,
            destLat,
            destLng,
          }),
          '*'
        );
      } else {
        webViewRef.current?.injectJavaScript(
          `if (window.recenterMap) { window.recenterMap(${activeLat}, ${activeLng}, ${destLat}, ${destLng}); } true;`
        );
      }
    } catch (err) {
      console.warn('Recenter location handler notice:', err);
    }

    if (onRecenter) {
      onRecenter();
    }
  };

  // Open source Leaflet map with OpenFreeMap (Overture Maps) tiles — clean silver theme
  const mapHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #F1F5F9; font-family: -apple-system, sans-serif; }
          /* Silver theme filter applied to tile layer for clean look */
          .leaflet-tile-pane { filter: saturate(0.35) brightness(1.05) contrast(0.95); }
          .truck-marker {
            width: 38px; height: 38px; border-radius: 50%;
            background: #1E293B; border: 3px solid #FFFFFF; color: #FFFFFF;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35); font-size: 16px;
          }
          .customer-marker {
            width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg); background: #D94A27; border: 3px solid #FFFFFF;
            color: #FFFFFF; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(217, 74, 39, 0.45);
          }
          .customer-marker span { transform: rotate(45deg); font-size: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let lMap, lTruckMarker, lCircle, lRouteLine;

          const driverCoord = { lat: ${driverLat}, lng: ${driverLng} };
          const destCoord = { lat: ${destLat}, lng: ${destLng} };

          function initMap() {
            if (lMap) return;
            lMap = L.map('map', { zoomControl: false, attributionControl: false });

            // Overture Maps Foundation / Carto Voyager tiles — open source, crisp vector-grade rendering
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              maxZoom: 20,
              subdomains: 'abcd',
              opacity: 0.98,
              attribution: '© OpenStreetMap contributors | Overture Maps Foundation'
            }).addTo(lMap);

            // 50m Geofence Circle
            lCircle = L.circle([destCoord.lat, destCoord.lng], {
              color: '#D94A27', fillColor: '#D94A27',
              fillOpacity: ${isInsideGeofence ? 0.18 : 0.06}, weight: 2.5, radius: 50
            }).addTo(lMap);

            // Route line connecting driver to destination
            lRouteLine = L.polyline([[driverCoord.lat, driverCoord.lng], [destCoord.lat, destCoord.lng]], {
              color: '#D94A27', weight: 3.5, opacity: 0.85
            }).addTo(lMap);

            // Customer destination pin
            const custIcon = L.divIcon({ className: 'c-pin', html: '<div class="customer-marker"><span>📍</span></div>', iconSize: [36, 36], iconAnchor: [18, 36] });
            L.marker([destCoord.lat, destCoord.lng], { icon: custIcon }).addTo(lMap);

            // Live driver truck marker
            const truckIcon = L.divIcon({ className: 't-pin', html: '<div class="truck-marker">🚚</div>', iconSize: [38, 38], iconAnchor: [19, 19] });
            lTruckMarker = L.marker([driverCoord.lat, driverCoord.lng], { icon: truckIcon }).addTo(lMap);

            // Fit both markers in view
            lMap.fitBounds([[destCoord.lat, destCoord.lng], [driverCoord.lat, driverCoord.lng]], { padding: [40, 40] });

            // Signal that map is ready
            window._mapReady = true;
          }

          // Smooth update without page reload — called from React Native
          window.updateDriverPosition = function(lat, lng, inside) {
            if (lTruckMarker) {
              lTruckMarker.setLatLng([lat, lng]);
              if (lRouteLine) lRouteLine.setLatLngs([[lat, lng], [destCoord.lat, destCoord.lng]]);
              if (lCircle && inside !== undefined) {
                lCircle.setStyle({ fillColor: inside ? '#15803D' : '#D94A27', fillOpacity: inside ? 0.22 : 0.06 });
              }
            }
          };

          // Smooth recenter on locate trigger
          window.recenterMap = function(dLat, dLng, cLat, cLng) {
            const driverP = dLat && dLng ? [dLat, dLng] : [driverCoord.lat, driverCoord.lng];
            const destP = cLat && cLng ? [cLat, cLng] : [destCoord.lat, destCoord.lng];

            if (lMap) {
              lMap.fitBounds([destP, driverP], { padding: [40, 40] });
            }
          };

          // Listen for postMessage updates from React Native
          window.addEventListener('message', function(event) {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data.type === 'UPDATE_DRIVER_LOCATION') {
                window.updateDriverPosition(data.lat, data.lng, data.isInsideGeofence);
              } else if (data.type === 'RECENTER_MAP') {
                window.recenterMap(data.driverLat, data.driverLng, data.destLat, data.destLng);
              }
            } catch(e) {}
          });

          // Initialize map immediately
          initMap();
        </script>
      </body>
    </html>
  `, [destLat, destLng]);

  return (
    <View style={styles.mapStage}>
      {/* Background Interactive Map */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Live Route Map"
            onLoad={handleMapLoaded}
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webview}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoad={handleMapLoaded}
          />
        )}
      </View>

      {/* Clean Map Header: Back to Queue (Left) & Recenter Locate Button (Right) */}
      <View style={styles.mapHeader}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color={THEME.colors.foreground} />
            <Text style={styles.backButtonText}>BACK TO QUEUE</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 1 }} />
        )}

        <TouchableOpacity
          style={styles.mapIconButton}
          onPress={handleLocateAndRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={19} color={THEME.colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Bottom Readout Overlay from design */}
      <View style={styles.mapBottomReadout}>
        <Ionicons name="navigate" size={14} color={THEME.colors.signal} />
        <Text style={styles.readoutText}>
          {distanceMeters !== null ? `${distanceMeters}M TO DOOR` : 'LOCATING'}
          <Text style={styles.readoutDot}> • </Text>
          {isInsideGeofence ? 'INSIDE 50M GEOFENCE' : 'EN ROUTE'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapStage: {
    height: 270,
    width: '100%',
    backgroundColor: '#EDF1EF',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  mapContainer: {
    ...(StyleSheet.absoluteFill as any),
  },
  webview: {
    flex: 1,
    backgroundColor: '#EDF1EF',
  },
  mapHeader: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unitChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.slate,
    letterSpacing: 1,
  },
  mapIconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mapBottomReadout: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CFD7D8',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  readoutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#52625F',
    letterSpacing: 1.2,
  },
  readoutDot: {
    color: '#8C979B',
  },
});
