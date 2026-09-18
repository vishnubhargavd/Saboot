import React, { useRef, useEffect, useMemo } from 'react';
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

  // Dispatch real-time coordinate updates to Google Map without reloading
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            type: 'UPDATE_DRIVER_LOCATION',
            lat: driverLat,
            lng: driverLng,
            isInsideGeofence,
          }),
          '*'
        );
      } catch {}
    } else {
      webViewRef.current?.injectJavaScript(
        `if (window.updateDriverPosition) { window.updateDriverPosition(${driverLat}, ${driverLng}, ${isInsideGeofence}); } true;`
      );
    }
  }, [driverLat, driverLng, isInsideGeofence]);

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

  // Google Maps JavaScript API with Clean Silver theme and SVG markers
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
          let gMap, gDriverMarker, gDestMarker, gCircle, gRouteLine;
          let isGoogleReady = false;
          let lMap, lTruckMarker, lCircle, lRouteLine;

          const driverCoord = { lat: ${driverLat}, lng: ${driverLng} };
          const destCoord = { lat: ${destLat}, lng: ${destLng} };

          // Try Google Maps first; gracefully fallback to Leaflet if network/API key restricts it
          function initGoogleMap() {
            try {
              if (typeof google !== 'undefined' && google.maps) {
                isGoogleReady = true;
                gMap = new google.maps.Map(document.getElementById('map'), {
                  center: driverCoord,
                  zoom: 16,
                  disableDefaultUI: true,
                  gestureHandling: 'greedy',
                  styles: [
                    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
                    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfdbfe" }] },
                    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] }
                  ]
                });

                // 50m Geofence Circle
                gCircle = new google.maps.Circle({
                  strokeColor: '#D94A27',
                  strokeOpacity: 0.85,
                  strokeWeight: 2,
                  fillColor: '#D94A27',
                  fillOpacity: ${isInsideGeofence ? 0.2 : 0.08},
                  map: gMap,
                  center: destCoord,
                  radius: 50
                });

                // Route Polyline
                gRouteLine = new google.maps.Polyline({
                  path: [driverCoord, destCoord],
                  geodesic: true,
                  strokeColor: '#D94A27',
                  strokeOpacity: 0.85,
                  strokeWeight: 3.5,
                  map: gMap
                });

                // Customer Pin
                gDestMarker = new google.maps.Marker({
                  position: destCoord,
                  map: gMap,
                  title: "Destination",
                  icon: {
                    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#D94A27" stroke="#FFFFFF" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#FFFFFF"/></svg>'),
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 36)
                  }
                });

                // Live Truck Marker
                gDriverMarker = new google.maps.Marker({
                  position: driverCoord,
                  map: gMap,
                  title: "Live Unit 24",
                  icon: {
                    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" fill="#1E293B" stroke="#FFFFFF" stroke-width="3"/><text x="19" y="24" font-size="18" text-anchor="middle" fill="#FFFFFF">🚚</text></svg>'),
                    scaledSize: new google.maps.Size(38, 38),
                    anchor: new google.maps.Point(19, 19)
                  }
                });

                const bounds = new google.maps.LatLngBounds();
                bounds.extend(destCoord);
                bounds.extend(driverCoord);
                gMap.fitBounds(bounds, 40);
                return;
              }
            } catch (e) {
              console.warn('Google Maps init notice, using fallback:', e);
            }

            initLeafletFallback();
          }

          function initLeafletFallback() {
            if (lMap) return;
            lMap = L.map('map', { zoomControl: false, attributionControl: false });
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.9 }).addTo(lMap);

            lCircle = L.circle([${destLat}, ${destLng}], {
              color: '#D94A27', fillColor: '#D94A27',
              fillOpacity: ${isInsideGeofence ? 0.18 : 0.06}, weight: 2.5, radius: 50
            }).addTo(lMap);

            lRouteLine = L.polyline([[${driverLat}, ${driverLng}], [${destLat}, ${destLng}]], {
              color: '#D94A27', weight: 3.5, opacity: 0.85
            }).addTo(lMap);

            const custIcon = L.divIcon({ className: 'c-pin', html: '<div class="customer-marker"><span>📍</span></div>', iconSize: [36, 36], iconAnchor: [18, 36] });
            L.marker([${destLat}, ${destLng}], { icon: custIcon }).addTo(lMap);

            const truckIcon = L.divIcon({ className: 't-pin', html: '<div class="truck-marker">🚚</div>', iconSize: [38, 38], iconAnchor: [19, 19] });
            lTruckMarker = L.marker([${driverLat}, ${driverLng}], { icon: truckIcon }).addTo(lMap);

            lMap.fitBounds([[${destLat}, ${destLng}], [${driverLat}, ${driverLng}]], { padding: [40, 40] });
          }

          // Smooth update without page reload
          window.updateDriverPosition = function(lat, lng, inside) {
            if (isGoogleReady && gDriverMarker) {
              const newPos = new google.maps.LatLng(lat, lng);
              gDriverMarker.setPosition(newPos);
              if (gRouteLine) gRouteLine.setPath([newPos, destCoord]);
              if (gCircle && inside !== undefined) {
                gCircle.setOptions({
                  fillColor: inside ? '#15803D' : '#D94A27',
                  fillOpacity: inside ? 0.22 : 0.08
                });
              }
            } else if (lTruckMarker) {
              lTruckMarker.setLatLng([lat, lng]);
              if (lRouteLine) lRouteLine.setLatLngs([[lat, lng], [${destLat}, ${destLng}]]);
              if (lCircle && inside !== undefined) {
                lCircle.setStyle({ fillColor: inside ? '#15803D' : '#D94A27', fillOpacity: inside ? 0.22 : 0.06 });
              }
            }
          };

          // Smooth recenter on locate trigger
          window.recenterMap = function(dLat, dLng, cLat, cLng) {
            const driverP = dLat && dLng ? { lat: dLat, lng: dLng } : driverCoord;
            const destP = cLat && cLng ? { lat: cLat, lng: cLng } : destCoord;

            if (isGoogleReady && gMap) {
              const b = new google.maps.LatLngBounds();
              b.extend(destP);
              b.extend(driverP);
              gMap.fitBounds(b, 40);
            } else if (lMap) {
              lMap.fitBounds([[destP.lat, destP.lng], [driverP.lat, driverP.lng]], { padding: [40, 40] });
            }
          };

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
        </script>
        <!-- Google Maps JS API script with callback and automatic fallback -->
        <script src="https://maps.googleapis.com/maps/api/js?key=&callback=initGoogleMap" async defer onerror="initLeafletFallback()"></script>
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
