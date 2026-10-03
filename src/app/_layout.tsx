import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { DatabaseProvider } from '@/database/provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <DatabaseProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-expense"
            options={{ presentation: 'modal', title: 'Add Expense' }}
          />
          <Stack.Screen
            name="expense/[id]"
            options={{ presentation: 'modal', title: 'Edit Expense' }}
          />
        </Stack>
      </ThemeProvider>
    </DatabaseProvider>
  );
}
