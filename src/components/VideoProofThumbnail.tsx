import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { generateRealisticThumbnailSvg } from '../services/videoVerificationService';
import { getSyncServerUrl } from '../services/realtimeSync';

export interface VideoProofThumbnailProps {
  uri?: string | null;
  target?: 'delivery' | 'absence';
  trackingNumber?: string;
  style?: StyleProp<ViewStyle>;
  allowPlayback?: boolean;
}

/**
 * Native VideoView component powered by expo-video (ExoPlayer on Android / AVPlayer on iOS)
 * Seamlessly plays local file:/// recorded videos without sandbox restrictions or blank screens.
 */
const NativeVideoItem: React.FC<{ uri: string; style?: StyleProp<ViewStyle> }> = ({
  uri,
  style,
}) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={[styles.nativeVideo, style]}
      contentFit="contain"
      nativeControls={true}
    />
  );
};

/**
 * Universal video proof footage player & thumbnail renderer
 * Ensures actual recorded camera videos and uploaded video files play
 * as clean, authentic, unwatermarked interactive video footage across Android, iOS, and Web.
 */
export const VideoProofThumbnail: React.FC<VideoProofThumbnailProps> = ({
  uri,
  target = 'delivery',
  trackingNumber,
  style,
  allowPlayback = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isVideoFile = Boolean(
    uri &&
      !uri.startsWith('data:image/svg') &&
      (uri.startsWith('file://') ||
        uri.startsWith('content://') ||
        uri.startsWith('ph://') ||
        uri.startsWith('blob:') ||
        uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('/api/') ||
        uri.toLowerCase().includes('.mp4') ||
        uri.toLowerCase().includes('.mov') ||
        uri.toLowerCase().includes('.webm') ||
        uri.toLowerCase().includes('.m4v') ||
        uri.toLowerCase().includes('.mkv') ||
        uri.toLowerCase().includes('.3gp') ||
        uri.includes('proof') ||
        uri.includes('recording') ||
        uri.includes('camera') ||
        uri.includes('/uploads/'))
  );

  const fileName = uri ? uri.split('/').pop()?.split('?')[0] : 'camera_proof.mp4';

  // 1. If uri is a REAL VIDEO FILE (Camera recording or uploaded MP4)
  if (isVideoFile && uri) {
    let resolvedUri = uri;
    if (uri.startsWith('/api/') || (uri.startsWith('/') && !uri.startsWith('file://'))) {
      resolvedUri = `${getSyncServerUrl()}${uri}`;
    }

    return (
      <View style={[styles.container, style]}>
        {Platform.OS === 'web' ? (
          <video
            src={resolvedUri}
            controls
            autoPlay
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' } as any}
          />
        ) : (
          <NativeVideoItem uri={resolvedUri} style={{ width: '100%', height: '100%' }} />
        )}

        {/* Clean unwatermarked controls: subtle fullscreen toggle button */}
        {allowPlayback && Platform.OS === 'web' && (
          <View style={styles.realVideoOverlay}>
            <TouchableOpacity
              style={styles.fullscreenBtn}
              onPress={() => setIsFullscreen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="expand" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Fullscreen Video Theater Modal for Web */}
        {Platform.OS === 'web' && (
          <Modal
            visible={isFullscreen}
            transparent={false}
            animationType="fade"
            onRequestClose={() => setIsFullscreen(false)}
          >
            <SafeAreaView style={styles.fullscreenContainer}>
              <View style={styles.fullscreenHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullscreenTitle}>CAMERA PROOF INSPECTOR</Text>
                  <Text style={styles.fullscreenSub}>{fileName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.fullscreenCloseBtn}
                  onPress={() => setIsFullscreen(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.fullscreenVideoWrapper}>
                <video
                  src={resolvedUri}
                  controls
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' } as any}
                />
              </View>
            </SafeAreaView>
          </Modal>
        )}
      </View>
    );
  }

  // 2. If uri is an SVG Data URI (synthetic test frame)
  if (uri && uri.startsWith('data:image/svg+xml')) {
    let svgString = '';
    if (uri.startsWith('data:image/svg+xml;utf8,')) {
      try {
        svgString = decodeURIComponent(uri.replace(/^data:image\/svg\+xml;utf8,/, ''));
      } catch {
        svgString = uri.replace(/^data:image\/svg\+xml;utf8,/, '');
      }
    } else {
      svgString = uri.replace(/^data:image\/svg\+xml[^,]*,/, '');
    }

    if (svgString.includes('<svg')) {
      return (
        <View style={[styles.container, style]}>
          <SvgXml xml={svgString} width="100%" height="100%" />
        </View>
      );
    }
  }

  // 3. If uri is a direct SVG XML string
  if (uri && uri.trim().startsWith('<svg')) {
    return (
      <View style={[styles.container, style]}>
        <SvgXml xml={uri} width="100%" height="100%" />
      </View>
    );
  }

  // 4. If uri is a valid raster photo image
  if (
    uri &&
    (uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('data:image/png') ||
      uri.startsWith('data:image/jpeg') ||
      uri.endsWith('.jpg') ||
      uri.endsWith('.jpeg') ||
      uri.endsWith('.png') ||
      uri.endsWith('.webp'))
  ) {
    return (
      <View style={[styles.container, style]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }

  // 5. Fallback only when no video exists yet
  const fallbackSvg = generateRealisticThumbnailSvg(target, { trackingNumber });
  return (
    <View style={[styles.container, style]}>
      <SvgXml xml={fallbackSvg} width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  realVideoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  fullscreenBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  fullscreenTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fullscreenSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fullscreenCloseBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  fullscreenVideoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
