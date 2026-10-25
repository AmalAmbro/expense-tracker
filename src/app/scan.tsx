import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { CameraOverlay, Spacing } from '@/constants/theme';
import { parseUpiQr } from '@/features/upi/utils/upi-qr';

const FRAME_SIZE = 240;

/** Scans a UPI QR code and hands it to the Pay screen. */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The camera reports the same code many times a second: act on a valid one once,
  // and only re-render for a rejected one when it's a different code.
  const handled = useRef(false);
  const lastRejected = useRef<string | null>(null);

  function onBarcodeScanned({ data }: BarcodeScanningResult) {
    if (handled.current) return;
    const result = parseUpiQr(data);
    if (!result.ok) {
      if (lastRejected.current !== data) {
        lastRejected.current = data;
        setError(result.error);
      }
      return;
    }
    handled.current = true;
    router.navigate({ pathname: '/pay', params: { qr: result.qr.raw } });
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText style={styles.message}>
          The camera is used only to scan UPI QR codes. Nothing is recorded or saved.
        </ThemedText>
        {permission.canAskAgain ? (
          <Button title="Allow camera" onPress={requestPermission} />
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              Camera access is turned off for this app. You can turn it on in Settings.
            </ThemedText>
            <Button title="Open Settings" onPress={() => Linking.openSettings()} />
          </>
        )}
        <TextButton title="Enter UPI ID instead" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <View style={styles.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <SafeAreaView style={styles.overlay} edges={['bottom']}>
        <View style={styles.frame} accessibilityLabel="Point the camera at a UPI QR code" />
        <View style={styles.panel}>
          <ThemedText style={styles.overlayText} accessibilityLiveRegion="polite">
            {error ?? 'Point the camera at a UPI QR code'}
          </ThemedText>
          <View style={styles.actions}>
            <TextButton
              title={torchOn ? 'Torch off' : 'Torch on'}
              accessibilityRole="switch"
              accessibilityState={{ checked: torchOn }}
              accessibilityLabel="Torch"
              onPress={() => setTorchOn((on) => !on)}
            />
            <TextButton title="Enter UPI ID instead" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    backgroundColor: CameraOverlay.background,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.six * 2,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 3,
    borderColor: CameraOverlay.frame,
    borderRadius: Spacing.three,
  },
  panel: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: CameraOverlay.scrim,
  },
  overlayText: {
    color: CameraOverlay.text,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
