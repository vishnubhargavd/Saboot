import React from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { PROXIMITY_POLICY } from '../constants/dwellPolicy';

interface LiveDeliveryMapProps {
  driverLat: number;
  driverLng: number;
  destLat: number;
  destLng: number;
  destAddress: string;
  distanceMeters: number | null;
  gpsAccuracy: number;
  isInsideGeofence: boolean;
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
}) => {
  // Leaflet HTML with Apple dark minimalist map styling & live pins
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #000000; }
          
          /* Dark monochrome map tiles */
          .leaflet-tile {
            filter: brightness(0.6) invert(1) contrast(1.8) hue-rotate(180deg) saturate(0.2);
          }
          
          /* Driver Marker Pulse */
          .driver-pulse {
            width: 20px;
            height: 20px;
            background: #FFFFFF;
            border-radius: 50%;
            border: 3px solid #000000;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
            animation: pulse-ring 2s infinite ease-out;
          }
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8); }
            70% { box-shadow: 0 0 0 16px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }
          
          /* Destination Flag Marker */
          .dest-marker {
            background: #FFFFFF;
            color: #000000;
            padding: 4px 8px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            font-weight: 800;
            border: 2px solid #000000;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
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

          // CartoDB Dark Matter tiles
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(map);

          // 50m Geofence Circle
          const geofenceCircle = L.circle([${destLat}, ${destLng}], {
            color: '#FFFFFF',
            fillColor: '#FFFFFF',
            fillOpacity: ${isInsideGeofence ? 0.15 : 0.05},
            weight: 1.5,
            dashArray: '4, 4',
            radius: 50
          }).addTo(map);

          // Destination Pin
          const destIcon = L.divIcon({
            className: 'dest-marker',
            html: '📍 Door (Target)',
            iconSize: [80, 24],
            iconAnchor: [40, 24]
          });
          L.marker([${destLat}, ${destLng}], { icon: destIcon }).addTo(map);

          // Driver Pin
          const driverIcon = L.divIcon({
            className: 'driver-pulse',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([${driverLat}, ${driverLng}], { icon: driverIcon }).addTo(map);

          // Fit bounds to show both driver and destination
          const bounds = L.latLngBounds([
            [${destLat}, ${destLng}],
            [${driverLat}, ${driverLng}]
          ]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Map Header Status Banner (High Accessibility) */}
      <View style={styles.headerBanner}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isInsideGeofence ? '#FFFFFF' : '#A1A1AA' }]} />
          <Text style={styles.headerTitle}>
            {isInsideGeofence ? 'You are at delivery door' : 'Moving towards address'}
          </Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {distanceMeters !== null ? `${distanceMeters}m away` : 'Locating...'}
          </Text>
        </View>
      </View>

      {/* Embedded Live Map View */}
      <View style={styles.mapFrame}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Live Delivery Map"
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

      {/* Footer Info for Seniors / Drivers */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="navigate-circle" size={16} color="#FFFFFF" />
          <Text style={styles.footerText}>GPS: ±{gpsAccuracy}m accuracy</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.footerText}>50m Geofence active</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  distanceBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    fontFamily: THEME.typography.fontFamily.mono,
  },
  mapFrame: {
    height: 180,
    width: '100%',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: THEME.colors.border,
  },
});
