import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplash } from '@/components/animated-splash';
import { NavigationThemes } from '@/constants/theme';
import { DatabaseProvider } from '@/database/provider';

/** Hide anyway after this long, so a startup error is never stuck behind the splash. */
const MAX_SPLASH_MS = 10000;

// The native splash stays up until AnimatedSplash takes over from it.
SplashScreen.preventAutoHideAsync();
setTimeout(SplashScreen.hide, MAX_SPLASH_MS);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <DatabaseProvider>
      <ThemeProvider value={NavigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-expense"
            options={{ presentation: 'modal', title: 'Add Expense' }}
          />
          <Stack.Screen
            name="scan"
            options={{ presentation: 'fullScreenModal', title: 'Scan UPI QR' }}
          />
          <Stack.Screen
            name="expense/[id]"
            options={{ presentation: 'modal', title: 'Edit Expense' }}
          />
        </Stack>
      </ThemeProvider>
      {/* Inside DatabaseProvider, so it starts once the database is open and migrated. */}
      <AnimatedSplash />
    </DatabaseProvider>
  );
}
