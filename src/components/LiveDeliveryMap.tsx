import React from 'react';
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
  onRecenter,
}) => {
  // Map rendered with the exact light logistics carto theme from the design
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #edf1ef; }
          
          /* Custom Truck Marker */
          .truck-marker {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #334454;
            border: 3px solid #ffffff;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(21, 32, 43, 0.25);
            font-size: 16px;
          }
          
          /* Customer Marker (Signal Red/Orange teardrop) */
          .customer-marker {
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: #d94a27;
            border: 3px solid #ffffff;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(217, 74, 39, 0.35);
          }
          .customer-marker span {
            transform: rotate(45deg);
            font-size: 14px;
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

          // Light CartoDB Positron / OSM tiles matching design
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(map);

          // 50m Geofence Circle with signal accent
          L.circle([${destLat}, ${destLng}], {
            color: '#d94a27',
            fillColor: '#d94a27',
            fillOpacity: ${isInsideGeofence ? 0.12 : 0.05},
            weight: 2,
            dashArray: '6, 6',
            radius: 50
          }).addTo(map);

          // Route line between truck and customer
          const routeLine = L.polyline([
            [${driverLat}, ${driverLng}],
            [${destLat}, ${destLng}]
          ], {
            color: '#d94a27',
            weight: 3,
            opacity: 0.75,
            dashArray: '4, 6'
          }).addTo(map);

          // Customer Pin
          const custIcon = L.divIcon({
            className: 'customer-marker-container',
            html: '<div class="customer-marker"><span>📍</span></div>',
            iconSize: [34, 34],
            iconAnchor: [17, 34]
          });
          L.marker([${destLat}, ${destLng}], { icon: custIcon }).addTo(map);

          // Truck Pin
          const truckIcon = L.divIcon({
            className: 'truck-marker-container',
            html: '<div class="truck-marker">🚚</div>',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });
          L.marker([${driverLat}, ${driverLng}], { icon: truckIcon }).addTo(map);

          const bounds = L.latLngBounds([
            [${destLat}, ${destLng}],
            [${driverLat}, ${driverLng}]
          ]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.mapStage}>
      {/* Background Interactive Map */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Live Route Map"
          />
        ) : (
          <WebView
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

      {/* Top Header Overlay from design */}
      <View style={styles.mapHeader}>
        <View style={styles.unitChip}>
          <Ionicons name="radio-outline" size={14} color={THEME.colors.slate} />
          <Text style={styles.unitChipText}>LIVE / UNIT 24</Text>
        </View>

        <TouchableOpacity style={styles.mapIconButton} onPress={onRecenter} activeOpacity={0.8}>
          <Ionicons name="locate-outline" size={18} color={THEME.colors.slate} />
        </TouchableOpacity>
      </View>

      {/* Bottom Readout Overlay from design */}
      <View style={styles.mapBottomReadout}>
        <Ionicons name="navigate" size={14} color={THEME.colors.signal} />
        <Text style={styles.readoutText}>
          {distanceMeters !== null ? `${distanceMeters}m TO DOOR` : 'APPROACHING'}
          <Text style={styles.readoutDot}> • </Text>
          {isInsideGeofence ? 'INSIDE 50M GEOFENCE' : 'EN ROUTE'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapStage: {
    height: 260,
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
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  unitChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  unitChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.slate,
    letterSpacing: 1,
  },
  mapIconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD7D8',
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBottomReadout: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#CFD7D8',
    zIndex: 10,
  },
  readoutText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#52625F',
    letterSpacing: 1.2,
  },
  readoutDot: {
    color: '#8C979B',
  },
});
