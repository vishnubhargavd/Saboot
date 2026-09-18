import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

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

  // Dispatch real-time coordinate updates to Leaflet without reloading iframe/webview
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

  // Clean OpenStreetMap tiles with ZERO API key watermarks + custom road overlays
  const mapHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #E8ECE9; }
          
          /* Clean custom Truck Marker */
          .truck-marker {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #334454;
            border: 3px solid #FFFFFF;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(21, 32, 43, 0.35);
            font-size: 16px;
            transition: transform 0.3s ease;
          }
          
          /* Customer Marker */
          .customer-marker {
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: #D94A27;
            border: 3px solid #FFFFFF;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(217, 74, 39, 0.45);
          }
          .customer-marker span {
            transform: rotate(45deg);
            font-size: 15px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            touchZoom: true
          });

          // OpenStreetMap tile layer (100% Free, NO API key watermark)
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            opacity: 0.85
          }).addTo(map);

          // 50m Geofence Circle with signal dashed boundary
          const geofenceCircle = L.circle([${destLat}, ${destLng}], {
            color: '#D94A27',
            fillColor: '#D94A27',
            fillOpacity: ${isInsideGeofence ? 0.18 : 0.06},
            weight: 2.5,
            dashArray: '6, 6',
            radius: 50
          }).addTo(map);
          window.geofenceCircle = geofenceCircle;

          // Route line between truck and customer
          const routeLine = L.polyline([
            [${driverLat}, ${driverLng}],
            [${destLat}, ${destLng}]
          ], {
            color: '#D94A27',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '5, 8'
          }).addTo(map);
          window.routeLine = routeLine;

          // Customer Pin
          const custIcon = L.divIcon({
            className: 'cust-pin',
            html: '<div class="customer-marker"><span>📍</span></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          L.marker([${destLat}, ${destLng}], { icon: custIcon }).addTo(map);

          // Truck Pin
          const truckIcon = L.divIcon({
            className: 'truck-pin',
            html: '<div class="truck-marker">🚚</div>',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });
          const truckMarker = L.marker([${driverLat}, ${driverLng}], { icon: truckIcon }).addTo(map);
          window.truckMarker = truckMarker;

          // Initial bounds
          const bounds = L.latLngBounds([
            [${destLat}, ${destLng}],
            [${driverLat}, ${driverLng}]
          ]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });

          // Real-time update function without reloads
          window.updateDriverPosition = function(lat, lng, inside) {
            if (window.truckMarker) {
              window.truckMarker.setLatLng([lat, lng]);
            }
            if (window.routeLine) {
              window.routeLine.setLatLngs([[lat, lng], [${destLat}, ${destLng}]]);
            }
            if (window.geofenceCircle && inside !== undefined) {
              window.geofenceCircle.setStyle({
                fillOpacity: inside ? 0.22 : 0.06,
                color: inside ? '#15803D' : '#D94A27'
              });
            }
          };

          // Message listener for Web postMessage
          window.addEventListener('message', function(event) {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data && data.type === 'UPDATE_DRIVER_LOCATION') {
                window.updateDriverPosition(data.lat, data.lng, data.isInsideGeofence);
              }
            } catch(e) {}
          });
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

      {/* Top Header Overlay with Back Button & Unit Chip */}
      <View style={styles.mapHeader}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color={THEME.colors.foreground} />
            <Text style={styles.backButtonText}>BACK TO QUEUE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.unitChip}>
            <Ionicons name="radio-outline" size={14} color={THEME.colors.slate} />
            <Text style={styles.unitChipText}>LIVE / UNIT 24</Text>
          </View>
        )}

        <View style={styles.headerRightGroup}>
          <View style={styles.unitChip}>
            <Ionicons name="radio-outline" size={13} color={THEME.colors.slate} />
            <Text style={styles.unitChipText}>UNIT 24</Text>
          </View>

          <TouchableOpacity style={styles.mapIconButton} onPress={onRecenter || onBack} activeOpacity={0.8}>
            <Ionicons name="locate-outline" size={18} color={THEME.colors.slate} />
          </TouchableOpacity>
        </View>
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
