import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Button, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
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
        <Button title="Enter UPI ID instead" onPress={() => router.back()} />
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
            <Pressable
              onPress={() => setTorchOn((on) => !on)}
              accessibilityRole="switch"
              accessibilityState={{ checked: torchOn }}
              accessibilityLabel="Torch"
              style={styles.action}
            >
              <ThemedText style={styles.overlayText}>
                {torchOn ? 'Torch off' : 'Torch on'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={styles.action}
            >
              <ThemedText style={styles.overlayText}>Enter UPI ID instead</ThemedText>
            </Pressable>
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
    backgroundColor: '#000',
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
    borderColor: '#fff',
    borderRadius: Spacing.three,
  },
  panel: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayText: {
    color: '#fff',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
