import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Must match `imageWidth` of the expo-splash-screen plugin in app.json. */
const IMAGE_SIZE = 192;

/** How long the splash stays after the app is ready, before fading out. */
const HOLD_MS = 1500;
const FADE_OUT_MS = 400;

const SPLASH_IMAGES = {
  light: require('@/assets/images/splash-light.png'),
  dark: require('@/assets/images/splash-dark.png'),
};

/**
 * Takes over from the native splash screen with an identical view (same image, size and
 * background), holds it briefly, then fades out to reveal the app — Android's own
 * splash can't fade. The images (logo plus app name) and `background` colours must match
 * the expo-splash-screen plugin config in app.json, or the handover shows a flash.
 */
export function AnimatedSplash() {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [isDone, setIsDone] = useState(false);
  const [isImageShown, setIsImageShown] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isImageShown) return;
    // The view underneath now looks exactly like the native splash, so swap them.
    SplashScreen.hide();

    const finish = () => setIsDone(true);
    opacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) scheduleOnRN(finish);
      }),
    );
  }, [isImageShown, opacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (isDone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: theme.background },
        containerStyle,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={SPLASH_IMAGES[scheme]}
        style={styles.image}
        onDisplay={() => setIsImageShown(true)}
        onError={() => setIsImageShown(true)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
});
