import { SymbolView } from 'expo-symbols';
import { Drawer } from 'expo-router/drawer';
import { ColorValue } from 'react-native';

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

function BulkEntryIcon({ color, size }: DrawerIconProps) {
  return (
    <SymbolView
      name={{ ios: 'text.badge.plus', android: 'playlist_add', web: 'playlist_add' }}
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

export default function DrawerLayout() {
  return (
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
        name="bulk-entry"
        options={{ title: 'Bulk Entry', drawerLabel: 'Bulk Entry', drawerIcon: BulkEntryIcon }}
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
  );
}
