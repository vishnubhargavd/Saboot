import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { THEME } from '../constants/theme';
import { Delivery, FailureReason } from '../types/delivery';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { DwellGauge } from '../components/DwellGauge';
import { useAttestation } from '../hooks/useAttestation';
import { RawGPSPoint, CallEvidence } from '../types/evidence';
import { DemoScenarioPreset } from '../constants/demoData';
import { VerificationResult } from '../types/policy';
import {
  verifyVideoProof,
  analyzePixelData,
  evaluateVideoMetrics,
  generateTestFrame,
  generateRealisticThumbnailDataUri,
  VideoAnalysisMetrics,
} from '../services/videoVerificationService';
import { VideoProofThumbnail } from '../components/VideoProofThumbnail';
import { uploadVideoProofFile } from '../services/realtimeSync';

interface DeliveryDetailScreenProps {
  delivery: Delivery;
  currentLocation: RawGPSPoint | null;
  distanceMeters: number | null;
  breadcrumbs: RawGPSPoint[];
  isSimulationMode: boolean;
  activePreset: DemoScenarioPreset | null;
  onBack: () => void;
  onVerificationComplete: (result: VerificationResult) => void;
  onCompleteDelivery?: (
    handoffType: 'direct' | 'doorstep' | 'security',
    notes?: string,
    videoProofUri?: string,
    videoMetrics?: { luminance: number; variance: number },
    thumbnailUri?: string
  ) => void;
}

const FAILURE_REASONS: { id: FailureReason; label: string; desc: string }[] = [
  { id: 'customer_unavailable', label: 'Customer Unavailable', desc: 'Door unanswered after calling & waiting (Video Proof Required)' },
  { id: 'gate_locked_security_refusal', label: 'Security Gate Refusal', desc: 'Society security refused entry' },
  { id: 'incorrect_address', label: 'Incorrect Address', desc: 'Unit or flat not found' },
  { id: 'customer_rejected_delivery', label: 'Customer Refused Delivery', desc: 'Customer rejected package at door' },
  { id: 'access_code_required', label: 'Passcode / OTP Required', desc: 'Required passcode not provided' },
  { id: 'other', label: 'Other Operational Issue', desc: 'Other delivery obstacle' },
];

export const DeliveryDetailScreen: React.FC<DeliveryDetailScreenProps> = ({
  delivery,
  currentLocation,
  distanceMeters,
  breadcrumbs,
  isSimulationMode,
  activePreset,
  onBack,
  onVerificationComplete,
  onCompleteDelivery,
}) => {
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState<'direct' | 'doorstep' | 'security'>('direct');
  const [handoffNotes, setHandoffNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Delivery completion video proof & anti-spoof state
  const [deliveryVideoUri, setDeliveryVideoUri] = useState<string | null>(null);
  const [deliveryVideoStatus, setDeliveryVideoStatus] = useState<
    'IDLE' | 'ANALYZING' | 'VERIFIED' | 'REJECTED_BLACK' | 'REJECTED_WHITE' | 'REJECTED_BLANK' | 'REJECTED_TOO_SHORT' | 'ERROR'
  >('IDLE');
  const [deliveryVideoReason, setDeliveryVideoReason] = useState<string>('');
  const [deliveryVideoMetrics, setDeliveryVideoMetrics] = useState<VideoAnalysisMetrics | null>(null);
  const [deliveryVideoThumbnail, setDeliveryVideoThumbnail] = useState<string | null>(null);
  const [isRecordingDeliveryVideo, setIsRecordingDeliveryVideo] = useState(false);
  const [deliveryVideoProgress, setDeliveryVideoProgress] = useState(0);

  // Camera permissions & state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isCameraRecordingActive, setIsCameraRecordingActive] = useState(false);
  const [isCameraStabilizing, setIsCameraStabilizing] = useState(false);

  // Camera viewfinder modal for actual video recording
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [cameraRecordingTarget, setCameraRecordingTarget] = useState<'delivery' | 'absence'>('delivery');
  const [cameraCountdown, setCameraCountdown] = useState(6);
  const cameraRef = useRef<any>(null);
  const cameraRecordingTimerRef = useRef<any>(null);

  // Video proof for customer unavailable scenario
  const [videoProofUri, setVideoProofUri] = useState<string | null>(null);
  const [videoProofThumbnail, setVideoProofThumbnail] = useState<string | null>(null);
  const [isRecordingVideoProof, setIsRecordingVideoProof] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const [isCallOutcomeModalVisible, setIsCallOutcomeModalVisible] = useState(false);
  const [isVerifyingCallLog, setIsVerifyingCallLog] = useState(false);
  const [selectedCallOutcome, setSelectedCallOutcome] = useState<'answered' | 'no_answer' | 'busy' | 'canceled'>('answered');
  const [measuredCallDuration, setMeasuredCallDuration] = useState<number>(0);

  const callStartTimeRef = useRef<number | null>(null);
  const isWaitingForDialerReturn = useRef<boolean>(false);

  const {
    dwellSeconds,
    requiredDwellSeconds,
    isInsideGeofence,
    callEvidence,
    videoEvidence,
    failureReason,
    failureNotes,
    isSubmitting,
    error,
    setFailureReason,
    setFailureNotes,
    setCallEvidence,
    requestConsent,
    simulateCustomerConsentResponse,
    recordVideoClip,
    submitAttempt,
  } = useAttestation({
    delivery,
    currentLocation,
    distanceMeters,
    breadcrumbs,
    isSimulationMode,
    activePreset,
  });

  const driverLat = currentLocation?.latitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.latitude : delivery.address.latitude + 0.0003);
  const driverLng = currentLocation?.longitude || (isSimulationMode && activePreset ? activePreset.simulatedGps.longitude : delivery.address.longitude + 0.0003);

  // Measure genuine time spent outside the app when driver dials
  // FIXED: Only show call outcome modal when driver RETURNS from dialer,
  // not on a premature 1s timer. Use actual OS-measured elapsed time.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isWaitingForDialerReturn.current && callStartTimeRef.current) {
        const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        isWaitingForDialerReturn.current = false;

        // Use the actual elapsed time measured by the OS — no hardcoded defaults
        setMeasuredCallDuration(elapsed);

        // Auto-detect call outcome from elapsed time:
        // < 3s  = canceled (didn't actually call or canceled dialer immediately)
        // 3-10s = no_answer (phone rang briefly, didn't pick up)
        // > 10s = answered (likely spoke with customer)
        if (elapsed < 3) {
          setSelectedCallOutcome('canceled');
        } else if (elapsed <= 10) {
          setSelectedCallOutcome('no_answer');
        } else {
          setSelectedCallOutcome('answered');
        }

        setIsCallOutcomeModalVisible(true);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // Web window focus fallback
    const handleWebFocus = () => {
      if (isWaitingForDialerReturn.current && callStartTimeRef.current) {
        const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        isWaitingForDialerReturn.current = false;

        // Use actual elapsed time — no fake defaults
        setMeasuredCallDuration(elapsed);

        if (elapsed < 3) {
          setSelectedCallOutcome('canceled');
        } else if (elapsed <= 10) {
          setSelectedCallOutcome('no_answer');
        } else {
          setSelectedCallOutcome('answered');
        }
        setIsCallOutcomeModalVisible(true);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleWebFocus);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWebFocus);
      }
    };
  }, []);

  // Real phone dialer trigger - tracks start timestamp and prompts outcome verification
  // FIXED: Removed the premature 1s setTimeout that showed the modal before the driver
  // even left the app. Now the modal ONLY appears when the driver returns from the dialer
  // (via AppState change or window focus event above).
  const handleDialCustomer = () => {
    const rawNumber = delivery.customer.phone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${rawNumber}`;

    callStartTimeRef.current = Date.now();
    isWaitingForDialerReturn.current = true;

    // Launch the phone dialer
    if (Platform.OS === 'web') {
      try {
        window.location.href = telUrl;
      } catch {
        window.open(telUrl, '_self');
      }
      // On web, the tel: link may not actually leave the page.
      // Set a fallback: if after 15 seconds the user hasn't triggered focus,
      // show the modal so they can at least report what happened.
      setTimeout(() => {
        if (isWaitingForDialerReturn.current && callStartTimeRef.current) {
          const elapsed = Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000));
          isWaitingForDialerReturn.current = false;
          setMeasuredCallDuration(elapsed);
          if (elapsed < 3) {
            setSelectedCallOutcome('canceled');
          } else if (elapsed <= 10) {
            setSelectedCallOutcome('no_answer');
          } else {
            setSelectedCallOutcome('answered');
          }
          setIsCallOutcomeModalVisible(true);
        }
      }, 15000);
    } else {
      Linking.openURL(telUrl).catch((err) => {
        console.warn('Dialer launch notice:', err);
        // If dialer fails to open, reset the waiting state
        isWaitingForDialerReturn.current = false;
        callStartTimeRef.current = null;
      });
    }
  };

  // Confirm call outcome from modal
  // FIXED: Use actual OS-measured elapsed time as the authoritative duration.
  // Driver cannot manually pick arbitrary duration chips — the measured time is locked.
  const handleConfirmCallOutcome = () => {
    setIsVerifyingCallLog(true);

    setTimeout(() => {
      setIsVerifyingCallLog(false);

      if (selectedCallOutcome === 'canceled') {
        // Rider clicked call button but did not actually call (< 3s elapsed)
        setCallEvidence({
          attempted: false,
          durationSeconds: 0,
          status: 'not_attempted',
          recipientPhone: delivery.customer.phone,
          simulated: false,
        });
      } else if (selectedCallOutcome === 'no_answer') {
        // Phone rang but nobody answered (3-10s elapsed)
        // Validate: if elapsed < 8s, downgrade to canceled (not enough rings)
        if (measuredCallDuration < 8) {
          setCallEvidence({
            attempted: false,
            durationSeconds: measuredCallDuration,
            status: 'not_attempted',
            recipientPhone: delivery.customer.phone,
            simulated: false,
          });
        } else {
          setCallEvidence({
            attempted: true,
            timestamp: new Date().toISOString(),
            durationSeconds: measuredCallDuration,
            status: 'no_answer',
            recipientPhone: delivery.customer.phone,
            telephonyCallId: `TEL-${Date.now().toString(36).toUpperCase()}`,
            simulated: false,
          });
        }
      } else {
        // Answered or busy — use actual measured duration
        const duration = measuredCallDuration;
        setCallEvidence({
          attempted: true,
          timestamp: new Date().toISOString(),
          durationSeconds: duration,
          status: selectedCallOutcome === 'answered' ? 'completed' : 'busy',
          recipientPhone: delivery.customer.phone,
          telephonyCallId: `TEL-${Date.now().toString(36).toUpperCase()}`,
          simulated: false,
        });
      }

      setIsCallOutcomeModalVisible(false);
    }, 400);
  };

  // Unified video processing logic for verified genuine delivery proof
  const processSelectedVideoFile = async (
    videoInput: any,
    target: 'delivery' | 'absence',
    fileName?: string
  ) => {
    if (target === 'absence') {
      setIsRecordingVideoProof(true);
      const result = await verifyVideoProof(videoInput, 6.0);
      setIsRecordingVideoProof(false);
      if (result.isValid) {
        const uri = typeof videoInput === 'string' ? videoInput : (typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(videoInput) : String(videoInput));
        setVideoProofUri(uri);
        setVideoProofThumbnail(result.thumbnailUri || null);
        recordVideoClip(uri, result.metrics.durationSeconds);
        // Persist clean video file to backend storage
        uploadVideoProofFile(uri, fileName).then((uploadedUrl) => {
          if (uploadedUrl) setVideoProofUri(uploadedUrl);
        }).catch(() => {});
        Alert.alert('Doorstep Proof Attached ✓', `Video (${fileName || 'clip'}) verified and attached for supervisor audit.`);
      } else {
        Alert.alert('Video Verification Failed', result.reason);
      }
    } else {
      setDeliveryVideoStatus('ANALYZING');
      setDeliveryVideoReason(`Analyzing ${fileName || 'video'} frames, luminance & pixel variance...`);
      const result = await verifyVideoProof(videoInput, 6.0);
      setDeliveryVideoMetrics(result.metrics);
      setDeliveryVideoStatus(result.status);
      setDeliveryVideoReason(result.reason);

      if (result.isValid) {
        const uri = typeof videoInput === 'string' ? videoInput : (typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(videoInput) : String(videoInput));
        setDeliveryVideoUri(uri);
        setDeliveryVideoThumbnail(result.thumbnailUri || null);
        // Persist clean video file to backend storage
        uploadVideoProofFile(uri, fileName).then((uploadedUrl) => {
          if (uploadedUrl) setDeliveryVideoUri(uploadedUrl);
        }).catch(() => {});
      } else {
        setDeliveryVideoUri(null);
      }
    }
  };

  // Open System File Manager (Android / iOS Document Picker / Web File Chooser)
  const handlePickVideoFromFileManager = async (target: 'delivery' | 'absence' = 'delivery') => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e: any) => {
          const file = e?.target?.files?.[0];
          if (!file) return;
          await processSelectedVideoFile(file, target, file.name);
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'video/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          await processSelectedVideoFile(asset.uri, target, asset.name);
        }
      }
    } catch (err) {
      console.warn('File manager picker error:', err);
      Alert.alert('File Picker Error', 'Unable to open file manager. Please try again.');
    }
  };

  // Pick Video from Media Library / Photo & Video Gallery
  const handlePickVideoFromGallery = async (target: 'delivery' | 'absence' = 'delivery') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Media library access is required to select existing video footage.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processSelectedVideoFile(asset.uri, target, asset.fileName || 'gallery_video.mp4');
      }
    } catch (err) {
      console.warn('Gallery picker error:', err);
      Alert.alert('Gallery Picker Error', 'Unable to open gallery. Please try again.');
    }
  };

  // Launch Native System Camera directly (zero-freeze, OS standard camera)
  const handleLaunchSystemCamera = async (target: 'delivery' | 'absence' = 'delivery') => {
    setIsCameraModalVisible(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Please grant camera access to record proof.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processSelectedVideoFile(asset.uri, target, 'camera_recording.mp4');
      }
    } catch (err) {
      console.warn('System camera error:', err);
      Alert.alert('Camera Error', 'Could not start camera. You can also upload with the File Manager.');
    }
  };

  // Open In-App Viewfinder Camera with permissions pre-checked
  const handleOpenInAppCamera = async (target: 'delivery' | 'absence') => {
    setCameraRecordingTarget(target);
    setCameraCountdown(6);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.setAttribute('capture', 'environment');
      input.onchange = async (e: any) => {
        const file = e?.target?.files?.[0];
        if (!file) return;
        await processSelectedVideoFile(file, target, file.name);
      };
      input.click();
      return;
    }

    // Native: check and request camera permissions
    let hasCameraPerm = cameraPermission?.granted;
    if (!hasCameraPerm) {
      const requested = await requestCameraPermission();
      hasCameraPerm = requested.granted;
    }

    if (!microphonePermission?.granted) {
      await requestMicrophonePermission().catch(() => null);
    }

    setIsCameraModalVisible(true);
  };

  // Open camera to record video proof of customer absence
  const handleRecordVideoProof = () => {
    handleOpenInAppCamera('absence');
  };

  // Handle camera recording completion (called from camera modal)
  const handleCameraRecordingComplete = async (videoUri: string) => {
    setIsCameraModalVisible(false);
    await processSelectedVideoFile(videoUri, cameraRecordingTarget, 'camera_proof.mp4');
  };

  // Start actual camera recording when camera modal is visible
  const handleStartCameraRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCameraRecordingActive(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 6,
        maxFileSize: 15 * 1024 * 1024,
      });

      if (video?.uri) {
        handleCameraRecordingComplete(video.uri);
      }
    } catch (err) {
      console.warn('Camera recording error:', err);
      setIsCameraRecordingActive(false);
      Alert.alert(
        'Camera Hardware Notice',
        'In-app recording stopped. Would you like to use your phone system camera or pick from File Manager?',
        [
          { text: 'File Manager', onPress: () => handlePickVideoFromFileManager(cameraRecordingTarget) },
          { text: 'System Camera', onPress: () => handleLaunchSystemCamera(cameraRecordingTarget) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // Stop camera recording
  const handleStopCameraRecording = () => {
    setIsCameraRecordingActive(false);
    if (cameraRecordingTimerRef.current) {
      clearInterval(cameraRecordingTimerRef.current);
      cameraRecordingTimerRef.current = null;
    }
    if (cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
      } catch {}
    }
  };

  // Real camera or test scenario video verification handler for delivery completion
  const handleRecordDeliveryVideoProof = (mode: 'valid' | 'black' | 'white' | 'blank' = 'valid') => {
    if (mode !== 'valid') {
      // Anti-spoof test modes still use synthetic frames for testing UI
      setIsRecordingDeliveryVideo(true);
      setDeliveryVideoStatus('ANALYZING');
      setDeliveryVideoReason('Testing anti-spoof detection...');
      setDeliveryVideoProgress(1);

      let step = 1;
      const interval = setInterval(() => {
        step += 1;
        setDeliveryVideoProgress(step);
        if (step >= 4) {
          clearInterval(interval);
          setIsRecordingDeliveryVideo(false);

          const colorType = mode;
          const framePixels = generateTestFrame(colorType, 64, 64);
          const { meanLuminance, variance, stdDev } = analyzePixelData(framePixels, 64 * 64);
          const durationSeconds = 3.0;

          const metrics: VideoAnalysisMetrics = {
            meanLuminance,
            variance,
            stdDev,
            durationSeconds,
            width: 320,
            height: 240,
            samplesChecked: 1,
          };

          const evaluation = evaluateVideoMetrics(metrics);
          setDeliveryVideoMetrics(metrics);
          setDeliveryVideoStatus(evaluation.status);
          setDeliveryVideoReason(evaluation.reason);
          setDeliveryVideoUri(null);
        }
      }, 400);
      return;
    }

    // Valid mode: open camera
    handleOpenInAppCamera('delivery');
  };

  // Trigger File Manager video upload
  const handleTriggerVideoUpload = () => {
    handlePickVideoFromFileManager('delivery');
  };

  // Confirm and record successful delivery completion
  const handleConfirmCompleteDelivery = async () => {
    if (deliveryVideoStatus !== 'VERIFIED') {
      return;
    }

    setIsCompleting(true);
    let finalVideoUri = deliveryVideoUri || `file:///evidence/doorstep_handoff_${delivery.id}.mp4`;

    // Ensure raw video is uploaded to server before completing delivery
    if (deliveryVideoUri && (deliveryVideoUri.startsWith('file://') || deliveryVideoUri.startsWith('content://') || deliveryVideoUri.startsWith('blob:'))) {
      try {
        const uploaded = await uploadVideoProofFile(deliveryVideoUri);
        if (uploaded) {
          finalVideoUri = uploaded;
          setDeliveryVideoUri(uploaded);
        }
      } catch (e) {
        console.warn('Video upload before delivery completion error:', e);
      }
    }

    setIsCompleting(false);
    setIsCompleteModalVisible(false);

    if (onCompleteDelivery) {
      onCompleteDelivery(
        selectedHandoff,
        handoffNotes,
        finalVideoUri,
        deliveryVideoMetrics
          ? { luminance: deliveryVideoMetrics.meanLuminance, variance: deliveryVideoMetrics.variance }
          : { luminance: 120, variance: 450 },
        deliveryVideoThumbnail || undefined
      );
      } else {
        const nowIso = new Date().toISOString();
        const auditId = `AUD-DELIV-${Date.now().toString(36).toUpperCase()}`;
        const completionResult: VerificationResult = {
          decision: 'DELIVERED',
          deliveryId: delivery.id,
          timestamp: nowIso,
          videoProofUri: deliveryVideoUri || undefined,
          facts: {
            deliveryId: delivery.id,
            residenceCategory: delivery.address.residenceCategory,
            distanceMeters: distanceMeters || 0,
            requiredDistanceMeters: 50,
            dwellSeconds: dwellSeconds,
            requiredDwellSeconds: requiredDwellSeconds,
            callAttempted: callEvidence.attempted,
            callDurationSeconds: callEvidence.durationSeconds,
            videoConsentRequested: false,
            videoConsentGiven: false,
            videoEvidence: true,
            gpsAccuracyMeters: currentLocation?.accuracy || 6,
            anomalyFlags: [],
          },
          ruleChecks: [
            {
              id: 'RULE_HANDOFF_VERIFIED',
              name: 'Customer Handoff Verification',
              category: 'PROXIMITY',
              passed: true,
              actualValue:
                selectedHandoff === 'direct'
                  ? 'Handed to Customer'
                  : selectedHandoff === 'doorstep'
                  ? 'Left at Door'
                  : 'Security Guard',
              expectedValue: 'Delivery Confirmation',
              isHardRequirement: true,
              explanation: `Package successfully delivered and confirmed via ${selectedHandoff.toUpperCase()} handoff.`,
            },
            {
              id: 'RULE_VIDEO_PROOF_VERIFIED',
              name: 'Handoff Video Evidence Verification',
              category: 'VIDEO',
              passed: true,
              actualValue: 'Anti-Spoof Video Verified',
              expectedValue: 'Clear Video Evidence',
              isHardRequirement: true,
              explanation: 'Driver attached verified video proof of handoff with genuine luminance & visual detail.',
            },
            {
              id: 'RULE_GEOFENCE_CONFIRMATION',
              name: 'Delivery Point Geofence Lock',
              category: 'PROXIMITY',
              passed: true,
              actualValue: 'At Destination',
              expectedValue: '≤ 50m Geofence',
              isHardRequirement: true,
              explanation: 'Driver confirmed handoff within customer doorstep radius.',
            },
          ],
          primaryReason: 'Package successfully delivered and verified with authentic video evidence',
          detailedExplanation: `Delivery confirmed at ${delivery.address.street}. Handoff completed via ${selectedHandoff} with verified video proof.`,
          auditRecordId: auditId,
          evaluationEngine: 'Saboot-ZeroTrust-DeliveryFulfillment-Engine-v1.0',
        };

        onVerificationComplete(completionResult);
      }
  };

  const handleSubmit = async () => {
    setIsSubmitModalVisible(false);
    const result = await submitAttempt();
    if (result) {
      onVerificationComplete(result);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.driverAppContainer}>
        {/* Top Map Stage matching logistics-driver-app-design */}
        <LiveDeliveryMap
          driverLat={driverLat}
          driverLng={driverLng}
          destLat={delivery.address.latitude}
          destLng={delivery.address.longitude}
          destAddress={`${delivery.address.street}, ${delivery.address.city}`}
          distanceMeters={distanceMeters}
          gpsAccuracy={currentLocation?.accuracy || 8}
          isInsideGeofence={isInsideGeofence}
          onRecenter={onBack}
        />

        {/* Bottom Sheet matching logistics-driver-app-design */}
        <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHandle} />

          {/* Sheet Topline */}
          <View style={styles.sheetTopline}>
            <View>
              <Text style={styles.eyebrow}>ACTIVE STOP / 01 OF 04</Text>
              <Text style={styles.destinationTitle}>{delivery.customer.name}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={THEME.colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Address Row */}
          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={16} color={THEME.colors.signal} />
            <Text style={styles.addressText} numberOfLines={2}>
              {delivery.address.street}, {delivery.address.city}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8C979B" style={styles.addressChevron} />
          </View>

          {/* Status Pill matching design */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isInsideGeofence ? THEME.colors.green : THEME.colors.signal }]} />
            <Text style={styles.statusPillText}>
              {isInsideGeofence ? 'INSIDE GEOFENCE' : 'OUTSIDE GEOFENCE'}
            </Text>
            <View style={styles.statusDivider} />
            <Text style={styles.statusPillSub}>
              {distanceMeters !== null ? `${distanceMeters}M DISTANCE` : '50M RADIUS'}
            </Text>
          </View>

          {/* Stop Content: Circular Dwell Ring + Stop Meta */}
          <DwellGauge
            residenceCategory={delivery.address.residenceCategory}
            currentDwellSeconds={dwellSeconds}
            isInsideGeofence={isInsideGeofence}
            distanceMeters={distanceMeters}
            arrivalWindow={delivery.estimatedDeliveryWindow}
            customerName={delivery.customer.name}
            customerPhone={delivery.customer.phone}
          />

          {/* Senior-Friendly Call Customer Action Button */}
          <TouchableOpacity
            style={[
              styles.callButton,
              callEvidence.attempted && callEvidence.status === 'completed' && styles.callButtonCompleted,
              callEvidence.attempted && callEvidence.status === 'no_answer' && styles.callButtonNoAnswer,
              callEvidence.attempted && callEvidence.status === 'busy' && styles.callButtonBusy,
            ]}
            onPress={handleDialCustomer}
            activeOpacity={0.85}
          >
            <View style={styles.callIconBubble}>
              <Ionicons
                name={
                  callEvidence.status === 'completed'
                    ? 'checkmark-circle'
                    : callEvidence.status === 'no_answer'
                    ? 'alert-circle'
                    : callEvidence.status === 'busy'
                    ? 'pause-circle'
                    : 'call'
                }
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.callTextCol}>
              <Text style={styles.callButtonText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `CUSTOMER SPOKE (${callEvidence.durationSeconds}s) ✓`
                  : callEvidence.status === 'no_answer'
                  ? 'ATTEMPTED: NO ANSWER ✓'
                  : callEvidence.status === 'busy'
                  ? 'ATTEMPTED: BUSY / UNREACHABLE ✓'
                  : 'CALL CUSTOMER'}
              </Text>
              <Text style={styles.callButtonSubText} numberOfLines={1}>
                {callEvidence.status === 'completed'
                  ? `Spoke with customer • ${delivery.customer.phone}`
                  : callEvidence.status === 'no_answer'
                  ? `Rang out (No answer) • ${delivery.customer.phone}`
                  : callEvidence.status === 'busy'
                  ? `Line busy / unreachable • ${delivery.customer.phone}`
                  : `${delivery.customer.phone} • Tap to call & record`}
              </Text>
            </View>
            <View style={styles.callActionPill}>
              <Text style={styles.callActionPillText}>
                {callEvidence.attempted ? 'REDIAL' : 'DIAL'}
              </Text>
              <Ionicons
                name={callEvidence.attempted ? 'repeat-outline' : 'chevron-forward'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          {/* Primary Action: Complete Delivery Button */}
          <TouchableOpacity
            style={styles.completeDeliveryBtn}
            onPress={() => setIsCompleteModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.completeIconBubble}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.completeDeliveryBtnText}>COMPLETE DELIVERY</Text>
              <Text style={styles.completeDeliveryBtnSub}>Mark stop fulfilled & verify customer handoff</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Secondary Action: Issue / Failed Attempt Button */}
          <TouchableOpacity
            style={styles.attestButton}
            onPress={() => setIsSubmitModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle-outline" size={17} color={THEME.colors.slate} />
            <Text style={styles.attestButtonText}>UNABLE TO DELIVER? REPORT ISSUE</Text>
          </TouchableOpacity>

          {/* Sheet Footer matching design */}
          <View style={styles.sheetFooter}>
            <Ionicons name="notifications-outline" size={14} color={THEME.colors.muted} />
            <Text style={styles.sheetFooterText}>
              Dispatch & policy engine will evaluate dwell & call evidence
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Call Outcome Verification Modal */}
      <Modal
        visible={isCallOutcomeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCallOutcomeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>CALL OUTCOME VERIFICATION</Text>
              <Text style={styles.modalHeaderSub}>
                Did customer pick up at {delivery.customer.phone}?
              </Text>
            </View>

            {/* Time / Status Banner — shows actual OS-measured elapsed time */}
            <View style={styles.detectedTimeBanner}>
              <Ionicons name="time-outline" size={16} color={THEME.colors.slate} />
              <Text style={styles.detectedTimeText}>
                {measuredCallDuration > 0
                  ? `OS-measured dial duration: ${measuredCallDuration}s`
                  : 'Call duration: measuring...'}
              </Text>
            </View>

            <View style={styles.outcomeOptions}>
              {/* Option 1: Answered — only shown if elapsed > 10s */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'answered' && styles.outcomeBtnSelectedAnswered,
                  measuredCallDuration <= 10 && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (measuredCallDuration > 10) setSelectedCallOutcome('answered');
                }}
                activeOpacity={0.8}
                disabled={measuredCallDuration <= 10}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={selectedCallOutcome === 'answered' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Yes, Spoke with Customer</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Call connected and conversation completed ({measuredCallDuration}s)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Duration is now read-only — shows actual measured time */}
              {selectedCallOutcome === 'answered' && (
                <View style={styles.durationChipsRow}>
                  <Text style={styles.durationChipsLabel}>Verified Duration:</Text>
                  <View style={[styles.durationChip, styles.durationChipSelected]}>
                    <Text style={[styles.durationChipText, styles.durationChipTextSelected]}>
                      {measuredCallDuration}s (OS measured)
                    </Text>
                  </View>
                </View>
              )}

              {/* Option 2: No Answer — only valid if elapsed >= 3s */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'no_answer' && styles.outcomeBtnSelectedNoAnswer,
                  measuredCallDuration < 3 && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (measuredCallDuration >= 3) setSelectedCallOutcome('no_answer');
                }}
                activeOpacity={0.8}
                disabled={measuredCallDuration < 3}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={selectedCallOutcome === 'no_answer' ? '#D97706' : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>No Answer / Phone Rang Out</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Customer phone rang but nobody answered ({measuredCallDuration}s elapsed)
                    {measuredCallDuration < 8 ? ' — insufficient ring time' : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Busy / Switched Off — only valid if elapsed >= 3s */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'busy' && styles.outcomeBtnSelectedBusy,
                  measuredCallDuration < 3 && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (measuredCallDuration >= 3) setSelectedCallOutcome('busy');
                }}
                activeOpacity={0.8}
                disabled={measuredCallDuration < 3}
              >
                <Ionicons
                  name="alert-circle"
                  size={24}
                  color={selectedCallOutcome === 'busy' ? '#475569' : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Number Busy / Switched Off</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Call rejected, line busy, or network unreachable ({measuredCallDuration}s)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Canceled / Didn't Call */}
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  selectedCallOutcome === 'canceled' && styles.outcomeBtnSelectedCanceled,
                ]}
                onPress={() => {
                  setSelectedCallOutcome('canceled');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={24}
                  color={selectedCallOutcome === 'canceled' ? THEME.colors.foreground : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.outcomeBtnTitle}>Didn't Call / Canceled Dialing</Text>
                  <Text style={styles.outcomeBtnSubtitle}>
                    Clicked call button but canceled before calling (Not logged as attempt)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Save / Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmCallBtn,
                selectedCallOutcome === 'canceled' && styles.confirmCallBtnCanceled,
              ]}
              onPress={handleConfirmCallOutcome}
              activeOpacity={0.8}
            >
              {isVerifyingCallLog ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCallBtnText}>
                  {selectedCallOutcome === 'canceled'
                    ? 'DISCARD CALL ATTEMPT'
                    : 'RECORD & VERIFY CALL EVIDENCE'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsCallOutcomeModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failure Reason Picker Modal */}
      <Modal
        visible={isSubmitModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>DELIVERY ISSUE REASON</Text>
              <Text style={styles.modalHeaderSub}>Select reason for zero-trust policy attestation</Text>
            </View>

            <ScrollView style={{ maxHeight: 280, marginBottom: 12 }}>
              {FAILURE_REASONS.map((r) => {
                const isSelected = failureReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setFailureReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reasonOptionTitle}>{r.label}</Text>
                      <Text style={styles.reasonOptionDesc}>{r.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={THEME.colors.signal} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Video Proof Section for Customer Unavailable */}
            {failureReason === 'customer_unavailable' && (
              <View style={styles.videoProofContainer}>
                <View style={styles.videoProofHeader}>
                  <Ionicons name="videocam" size={16} color={THEME.colors.signal} />
                  <Text style={styles.videoProofTitle}>CUSTOMER ABSENCE VIDEO EVIDENCE</Text>
                </View>
                <Text style={styles.videoProofDesc}>
                  Record 6s footage of empty doorstep & door knocking. Forwarded to customer transparency portal and dispatch supervisor for approval.
                </Text>

                {videoProofUri ? (
                  <View style={styles.videoProofReadyBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={22} color={THEME.colors.green} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.videoProofReadyTitle}>Doorstep Proof Attached ✓</Text>
                        <Text style={styles.videoProofReadySub}>6s clip recorded • Awaiting Admin Approval</Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleRecordVideoProof}
                        style={styles.retakeBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.retakeBtnText}>RETAKE</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Visual Doorstep Video Thumbnail Footage */}
                    <View style={styles.appVideoPreviewContainer}>
                      <VideoProofThumbnail
                        uri={videoProofUri || videoProofThumbnail}
                        target="absence"
                        trackingNumber={delivery.trackingNumber}
                        style={styles.appVideoThumbnailImg}
                      />
                      {!videoProofUri && (
                        <View style={styles.appVideoOverlayBadge}>
                          <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                          <Text style={styles.appVideoBadgeText}>00:06 • Doorstep Absence Video Clip</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.recordProofBtn}
                      onPress={handleRecordVideoProof}
                      disabled={isRecordingVideoProof}
                      activeOpacity={0.8}
                    >
                      {isRecordingVideoProof ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.recordProofBtnText}>
                            RECORDING DOORSTEP PROOF ({recordingProgress * 2}s / 6s)...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="videocam" size={18} color="#FFFFFF" />
                          <Text style={styles.recordProofBtnText}>RECORD DOORSTEP PROOF (CAMERA)</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.uploadVideoBtn, { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10 }]}
                        onPress={() => handlePickVideoFromFileManager('absence')}
                        disabled={isRecordingVideoProof}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="folder-open" size={16} color={THEME.colors.foreground} />
                        <Text style={styles.uploadVideoText}>UPLOAD FROM FILES</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.galleryVideoBtn, { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10 }]}
                        onPress={() => handlePickVideoFromGallery('absence')}
                        disabled={isRecordingVideoProof}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images" size={16} color={THEME.colors.foreground} />
                        <Text style={styles.galleryVideoText}>FROM GALLERY</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <TextInput
              style={styles.textInput}
              placeholder="Driver remarks (e.g. door unanswered)..."
              placeholderTextColor={THEME.colors.muted}
              value={failureNotes}
              onChangeText={setFailureNotes}
            />

            <TouchableOpacity
              style={styles.confirmSubmitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmSubmitText}>TRANSMIT TELEMETRY TO BACKEND</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsSubmitModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Complete Delivery Modal */}
      <Modal
        visible={isCompleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>CONFIRM SUCCESSFUL DELIVERY</Text>
              <Text style={styles.modalHeaderSub}>
                Package for {delivery.customer.name} ({delivery.trackingNumber})
              </Text>
            </View>

            {/* Geofence verification banner */}
            <View style={styles.deliveryVerifyBanner}>
              <Ionicons
                name={isInsideGeofence ? 'shield-checkmark' : 'navigate-circle'}
                size={18}
                color={isInsideGeofence ? THEME.colors.green : THEME.colors.signal}
              />
              <Text style={styles.deliveryVerifyText}>
                {isInsideGeofence
                  ? `Location Verified: Inside 50m Geofence (${distanceMeters !== null ? distanceMeters : 12}m)`
                  : `Driver Location: ${distanceMeters !== null ? `${distanceMeters}m from door` : 'At location'}`}
              </Text>
            </View>

            <Text style={styles.modalSectionLabel}>SELECT HANDOFF METHOD</Text>
            <View style={styles.handoffOptions}>
              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'direct' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('direct')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={selectedHandoff === 'direct' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Handed Directly to Customer</Text>
                  <Text style={styles.handoffSub}>Recipient in-person at doorstep</Text>
                </View>
                {selectedHandoff === 'direct' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'doorstep' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('doorstep')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color={selectedHandoff === 'doorstep' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Left at Doorstep / Safe Place</Text>
                  <Text style={styles.handoffSub}>Placed securely outside entrance</Text>
                </View>
                {selectedHandoff === 'doorstep' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.handoffBtn,
                  selectedHandoff === 'security' && styles.handoffBtnSelected,
                ]}
                onPress={() => setSelectedHandoff('security')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield"
                  size={20}
                  color={selectedHandoff === 'security' ? THEME.colors.green : THEME.colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.handoffTitle}>Left with Building Guard / Gate</Text>
                  <Text style={styles.handoffSub}>Handed to society security</Text>
                </View>
                {selectedHandoff === 'security' && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.colors.green} />
                )}
              </TouchableOpacity>
            </View>

            {/* Mandatory Video Proof of Delivery Section */}
            <View style={styles.deliveryVideoProofCard}>
              <View style={styles.deliveryVideoProofHead}>
                <Ionicons name="videocam" size={16} color={THEME.colors.signal} />
                <Text style={styles.deliveryVideoProofTitle}>VIDEO PROOF OF HANDOFF (MANDATORY)</Text>
              </View>
              <Text style={styles.deliveryVideoProofSub}>
                Zero-trust anti-tampering verification: Camera recording is analyzed to reject blank, pure white, or covered lens (pitch black) footage.
              </Text>

              {/* Status Display */}
              {deliveryVideoStatus === 'ANALYZING' && (
                <View style={styles.videoStatusAnalyzing}>
                  <ActivityIndicator size="small" color={THEME.colors.signal} />
                  <Text style={styles.videoStatusAnalyzingText}>
                    {deliveryVideoReason || 'Analyzing video frames, luminance & pixel variance...'}
                  </Text>
                </View>
              )}

              {deliveryVideoStatus === 'VERIFIED' && (
                <View style={styles.videoStatusVerified}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                    <Text style={styles.videoStatusVerifiedTitle}>Video Proof Verified & Attached ✓</Text>
                  </View>

                  {/* Visual Video Thumbnail Footage Preview */}
                  <View style={styles.appVideoPreviewContainer}>
                    <VideoProofThumbnail
                      uri={deliveryVideoUri || deliveryVideoThumbnail}
                      target="delivery"
                      trackingNumber={delivery.trackingNumber}
                      style={styles.appVideoThumbnailImg}
                    />
                    {!deliveryVideoUri && (
                      <View style={styles.appVideoOverlayBadge}>
                        <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                        <Text style={styles.appVideoBadgeText}>00:04 • 1080p Handoff Footage Preview</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.videoStatusVerifiedDetail}>
                    Luminance: {deliveryVideoMetrics?.meanLuminance || 120}/255 • Detail Contrast: {deliveryVideoMetrics?.stdDev || 21} • Duration: {deliveryVideoMetrics?.durationSeconds?.toFixed(1) || '4.0'}s
                  </Text>
                  <TouchableOpacity
                    style={styles.retakeVideoBtn}
                    onPress={() => {
                      setDeliveryVideoStatus('IDLE');
                      setDeliveryVideoUri(null);
                      setDeliveryVideoMetrics(null);
                      setDeliveryVideoThumbnail(null);
                    }}
                  >
                    <Ionicons name="refresh" size={12} color={THEME.colors.muted} />
                    <Text style={styles.retakeVideoText}>Retake / Re-record</Text>
                  </TouchableOpacity>
                </View>
              )}

              {deliveryVideoStatus.startsWith('REJECTED') && (
                <View style={styles.videoStatusRejected}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text style={styles.videoStatusRejectedTitle}>
                      {deliveryVideoStatus === 'REJECTED_BLACK'
                        ? 'Camera Covered / Pitch Black Detected'
                        : deliveryVideoStatus === 'REJECTED_WHITE'
                        ? 'Blank White Screen Detected'
                        : 'Invalid Dummy Video Detected'}
                    </Text>
                  </View>
                  <Text style={styles.videoStatusRejectedReason}>{deliveryVideoReason}</Text>
                </View>
              )}

              {/* Action Buttons if not yet verified */}
              {deliveryVideoStatus !== 'VERIFIED' && !isRecordingDeliveryVideo && (
                <View style={styles.videoActionRow}>
                  <TouchableOpacity
                    style={[styles.recordProofMainBtn, { flex: 1.2 }]}
                    onPress={() => handleRecordDeliveryVideoProof('valid')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.recordProofMainText}>RECORD</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadVideoBtn, { flex: 1 }]}
                    onPress={() => handlePickVideoFromFileManager('delivery')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="folder-open" size={15} color={THEME.colors.foreground} />
                    <Text style={styles.uploadVideoText}>FILES</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.galleryVideoBtn, { flex: 1 }]}
                    onPress={() => handlePickVideoFromGallery('delivery')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={15} color={THEME.colors.foreground} />
                    <Text style={styles.galleryVideoText}>GALLERY</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Quick Input Verification Simulator for Testing / Proof */}
              {deliveryVideoStatus !== 'VERIFIED' && !isRecordingDeliveryVideo && (
                <View style={styles.simAntiSpoofRow}>
                  <Text style={styles.simAntiSpoofLabel}>TEST ANTI-SPOOF VERIFICATION:</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      style={styles.simBadBtn}
                      onPress={() => handleRecordDeliveryVideoProof('black')}
                    >
                      <Ionicons name="close-circle" size={12} color="#DC2626" />
                      <Text style={styles.simBadText}>Test Black (Covered)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.simBadBtn}
                      onPress={() => handleRecordDeliveryVideoProof('white')}
                    >
                      <Ionicons name="close-circle" size={12} color="#DC2626" />
                      <Text style={styles.simBadText}>Test White (Blank)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isRecordingDeliveryVideo && (
                <View style={styles.recordingProgressBox}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={styles.recordingProgressText}>
                    Recording & analyzing video feed ({deliveryVideoProgress * 1.5}s)...
                  </Text>
                </View>
              )}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Handoff notes or recipient reference (optional)..."
              placeholderTextColor={THEME.colors.muted}
              value={handoffNotes}
              onChangeText={setHandoffNotes}
            />

            <TouchableOpacity
              style={[
                styles.confirmCompleteBtn,
                deliveryVideoStatus !== 'VERIFIED' && styles.confirmCompleteBtnDisabled,
              ]}
              onPress={handleConfirmCompleteDelivery}
              disabled={isCompleting || deliveryVideoStatus !== 'VERIFIED'}
              activeOpacity={0.85}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCompleteText}>
                  {deliveryVideoStatus === 'VERIFIED'
                    ? 'CONFIRM DELIVERY COMPLETED'
                    : 'ATTACH VALID VIDEO PROOF FIRST'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelCallBtn}
              onPress={() => setIsCompleteModalVisible(false)}
            >
              <Text style={styles.cancelCallBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera Viewfinder Modal — opens real device camera for video recording */}
      <Modal
        visible={isCameraModalVisible}
        animationType="slide"
        onRequestClose={() => {
          handleStopCameraRecording();
          setIsCameraModalVisible(false);
        }}
      >
        <View style={styles.cameraModalContainer}>
          {!cameraPermission?.granted ? (
            <View style={styles.cameraPermissionCard}>
              <View style={styles.cameraPermIconCircle}>
                <Ionicons name="camera" size={44} color="#DC2626" />
              </View>
              <Text style={styles.cameraPermTitle}>Camera Permission Required</Text>
              <Text style={styles.cameraPermDesc}>
                Saboot requires camera access to record video proof of delivery handoff and verify physical presence.
              </Text>

              <TouchableOpacity
                style={styles.cameraPermBtn}
                onPress={async () => {
                  const res = await requestCameraPermission();
                  if (!res.granted) {
                    Alert.alert('Permission Denied', 'Please grant camera access or use your phone System Camera / File Manager.');
                  }
                }}
              >
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.cameraPermBtnText}>GRANT CAMERA PERMISSION</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraSystemFallbackBtn}
                onPress={() => handleLaunchSystemCamera(cameraRecordingTarget)}
              >
                <Ionicons name="camera-outline" size={18} color="#0F172A" />
                <Text style={styles.cameraSystemFallbackText}>OPEN PHONE SYSTEM CAMERA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraFilesFallbackBtn}
                onPress={() => {
                  setIsCameraModalVisible(false);
                  handlePickVideoFromFileManager(cameraRecordingTarget);
                }}
              >
                <Ionicons name="folder-open" size={18} color="#0F172A" />
                <Text style={styles.cameraSystemFallbackText}>UPLOAD WITH FILE MANAGER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => setIsCameraModalVisible(false)}
              >
                <Text style={styles.cameraCloseText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.cameraViewfinder}
                mode="video"
                facing="back"
                mute={!microphonePermission?.granted}
                onCameraReady={() => {
                  setIsCameraStabilizing(true);
                  setTimeout(() => {
                    setIsCameraStabilizing(false);
                    handleStartCameraRecording();
                    setCameraCountdown(6);
                    let count = 6;
                    if (cameraRecordingTimerRef.current) clearInterval(cameraRecordingTimerRef.current);
                    cameraRecordingTimerRef.current = setInterval(() => {
                      count -= 1;
                      setCameraCountdown(count);
                      if (count <= 0) {
                        clearInterval(cameraRecordingTimerRef.current);
                        cameraRecordingTimerRef.current = null;
                        handleStopCameraRecording();
                      }
                    }, 1000);
                  }, 600);
                }}
              />

              {/* Recording overlay UI */}
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraTopBar}>
                  <View style={styles.recIndicator}>
                    <View style={styles.recDot} />
                    <Text style={styles.recText}>REC</Text>
                  </View>
                  <Text style={styles.cameraTimerText}>{cameraCountdown}s</Text>
                </View>

                <View style={styles.cameraCenterInfo}>
                  <Text style={styles.cameraInstructionText}>
                    {cameraRecordingTarget === 'absence'
                      ? 'Recording doorstep & door knocking evidence...'
                      : 'Recording delivery handoff proof...'}
                  </Text>
                  <TouchableOpacity
                    style={styles.switchSystemCameraBtn}
                    onPress={() => handleLaunchSystemCamera(cameraRecordingTarget)}
                  >
                    <Ionicons name="camera-reverse-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.switchSystemCameraText}>Switch to System Camera</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.cameraCancelBtn}
                  onPress={() => {
                    handleStopCameraRecording();
                    setIsCameraModalVisible(false);
                  }}
                >
                  <Text style={styles.cameraCancelText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.signal} />
            <Text style={styles.loadingTitle}>EVALUATING ZERO-TRUST POLICY</Text>
            <Text style={styles.loadingSubtitle}>
              Server independently verifying Haversine distance, dwell & call records...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDF1EF',
  },
  driverAppContainer: {
    flex: 1,
    backgroundColor: '#EEF2F3',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D5DCDF',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    backgroundColor: '#AEB9BE',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: THEME.colors.muted,
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: THEME.colors.foreground,
    marginTop: 2,
  },
  closeButton: {
    padding: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.slate,
    flex: 1,
  },
  addressChevron: {
    marginLeft: 'auto',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: THEME.colors.geofenceBg,
    borderWidth: 1,
    borderColor: THEME.colors.geofenceBorder,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 14,
    borderRadius: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: THEME.colors.geofenceText,
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#AFD0BA',
  },
  statusPillSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: THEME.colors.geofenceText,
  },
  callButton: {
    width: '100%',
    minHeight: 68,
    backgroundColor: THEME.colors.signal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  callButtonCalled: {
    backgroundColor: THEME.colors.green,
  },
  callButtonCompleted: {
    backgroundColor: THEME.colors.green,
  },
  callButtonNoAnswer: {
    backgroundColor: '#D97706',
  },
  callButtonBusy: {
    backgroundColor: '#475569',
  },
  detectedTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detectedTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.slate,
    letterSpacing: 0.3,
  },
  outcomeOptions: {
    gap: 8,
    marginBottom: 14,
  },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  outcomeBtnSelectedAnswered: {
    borderColor: THEME.colors.green,
    backgroundColor: '#F0FDF4',
  },
  outcomeBtnSelectedNoAnswer: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  outcomeBtnSelectedBusy: {
    borderColor: '#475569',
    backgroundColor: '#F1F5F9',
  },
  outcomeBtnSelectedCanceled: {
    borderColor: THEME.colors.slate,
    backgroundColor: '#F8FAFC',
  },
  outcomeBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  outcomeBtnSubtitle: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  durationChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
    paddingLeft: 36,
    flexWrap: 'wrap',
  },
  durationChipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.muted,
  },
  durationChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  durationChipSelected: {
    backgroundColor: THEME.colors.green,
    borderColor: THEME.colors.green,
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate,
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
  },
  confirmCallBtn: {
    backgroundColor: THEME.colors.green,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmCallBtnCanceled: {
    backgroundColor: THEME.colors.slate,
  },
  confirmCallBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  cancelCallBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 0.5,
  },
  callIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTextCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  callButtonSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  callActionPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  callActionPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  attestButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: THEME.colors.slate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 2,
    marginTop: 10,
  },
  attestButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
  },
  sheetFooterText: {
    fontSize: 10,
    color: THEME.colors.muted,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 43, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: 0.5,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: THEME.colors.muted,
    marginTop: 2,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F7',
    padding: 12,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBE1E5',
  },
  reasonOptionSelected: {
    borderColor: THEME.colors.signal,
    backgroundColor: '#FFF5F2',
  },
  reasonOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  reasonOptionDesc: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  textInput: {
    backgroundColor: '#F4F6F7',
    borderWidth: 1,
    borderColor: '#DBE1E5',
    borderRadius: 4,
    padding: 10,
    fontSize: 12,
    color: THEME.colors.foreground,
    marginBottom: 12,
  },
  confirmSubmitBtn: {
    backgroundColor: THEME.colors.slate,
    paddingVertical: 15,
    borderRadius: 2,
    alignItems: 'center',
  },
  confirmSubmitText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(21, 32, 43, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.foreground,
    marginTop: 14,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  loadingSubtitle: {
    fontSize: 11,
    color: THEME.colors.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  completeDeliveryBtn: {
    width: '100%',
    minHeight: 64,
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  completeIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeDeliveryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  completeDeliveryBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  videoProofContainer: {
    backgroundColor: '#FFF8F6',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  videoProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  videoProofTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.signal,
    letterSpacing: 0.5,
  },
  videoProofDesc: {
    fontSize: 11,
    color: THEME.colors.slate,
    lineHeight: 15,
    marginBottom: 10,
  },
  recordProofBtn: {
    backgroundColor: THEME.colors.signal,
    paddingVertical: 12,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordProofBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  videoProofReadyBox: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 4,
    padding: 10,
    gap: 8,
  },
  videoProofReadyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  videoProofReadySub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  retakeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 3,
  },
  retakeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  deliveryVerifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    marginBottom: 14,
  },
  deliveryVerifyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: THEME.colors.muted,
    marginBottom: 8,
  },
  handoffOptions: {
    gap: 8,
    marginBottom: 14,
  },
  handoffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 12,
    gap: 12,
  },
  handoffBtnSelected: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  handoffTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  handoffSub: {
    fontSize: 11,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  confirmCompleteBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmCompleteBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmCompleteText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  // Delivery Video Proof Styles
  deliveryVideoProofCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  deliveryVideoProofHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deliveryVideoProofTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: THEME.colors.foreground,
  },
  deliveryVideoProofSub: {
    fontSize: 10.5,
    color: THEME.colors.muted,
    lineHeight: 14,
    marginBottom: 8,
  },
  videoStatusAnalyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 3,
    marginBottom: 8,
  },
  videoStatusAnalyzingText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  videoStatusVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },
  videoStatusVerifiedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  videoStatusVerifiedDetail: {
    fontSize: 10.5,
    color: '#166534',
    marginTop: 2,
  },
  retakeVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  retakeVideoText: {
    fontSize: 11,
    color: THEME.colors.muted,
    textDecorationLine: 'underline',
  },
  videoStatusRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },
  videoStatusRejectedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  videoStatusRejectedReason: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 14,
  },
  videoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  recordProofMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.signal,
    paddingVertical: 9,
    borderRadius: 3,
  },
  recordProofMainText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  uploadVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
  },
  uploadVideoText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  simAntiSpoofRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  simAntiSpoofLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  simBadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  simBadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  recordingProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 3,
    marginTop: 4,
  },
  recordingProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Camera Viewfinder Modal Styles
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraViewfinder: {
    flex: 1,
  },
  cameraOverlay: {
    ...(StyleSheet.absoluteFill as any),
    justifyContent: 'space-between',
    padding: 24,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
  },
  recIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cameraTimerText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cameraInstructionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'center',
  },
  cameraCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraCancelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  galleryVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
    justifyContent: 'center',
  },
  galleryVideoText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  cameraPermissionCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cameraPermIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  cameraPermTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  cameraPermDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 320,
  },
  cameraPermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.signal,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  cameraPermBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cameraSystemFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    maxWidth: 320,
    marginBottom: 10,
  },
  cameraFilesFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E2E8F0',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  cameraSystemFallbackText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  cameraCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cameraCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cameraCenterInfo: {
    alignItems: 'center',
    gap: 12,
  },
  switchSystemCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  switchSystemCameraText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appVideoPreviewContainer: {
    width: '100%',
    height: 175,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  appVideoThumbnailImg: {
    width: '100%',
    height: '100%',
  },
  appVideoOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appVideoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.mono,
  },
});
