import { SymbolView } from 'expo-symbols';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { ColorValue, useColorScheme } from 'react-native';

type DrawerIconProps = { color: ColorValue; size: number };

function HomeIcon({ color, size }: DrawerIconProps) {
  return (
    <SymbolView
      name={{ ios: 'house', android: 'home', web: 'home' }}
      tintColor={color}
      size={size}
    />
  );
}

function HistoryIcon({ color, size }: DrawerIconProps) {
  return (
    <SymbolView
      name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'list' }}
      tintColor={color}
      size={size}
    />
  );
}

function AnalyticsIcon({ color, size }: DrawerIconProps) {
  return (
    <SymbolView
      name={{ ios: 'chart.pie', android: 'pie_chart', web: 'pie_chart' }}
      tintColor={color}
      size={size}
    />
  );
}

function SettingsIcon({ color, size }: DrawerIconProps) {
  return (
    <SymbolView
      name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
      tintColor={color}
      size={size}
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer>
        <Drawer.Screen
          name="index"
          options={{ title: 'Home', drawerLabel: 'Home', drawerIcon: HomeIcon }}
        />
        <Drawer.Screen
          name="history"
          options={{ title: 'History', drawerLabel: 'History', drawerIcon: HistoryIcon }}
        />
        <Drawer.Screen
          name="analytics"
          options={{ title: 'Analytics', drawerLabel: 'Analytics', drawerIcon: AnalyticsIcon }}
        />
        <Drawer.Screen
          name="settings"
          options={{ title: 'Settings', drawerLabel: 'Settings', drawerIcon: SettingsIcon }}
        />
      </Drawer>
    </ThemeProvider>
  );
}
