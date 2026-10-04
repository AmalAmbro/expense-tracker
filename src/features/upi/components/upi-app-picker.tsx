import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import type { UpiProvider } from '@/features/upi/providers';
import { useTheme } from '@/hooks/use-theme';

const ICON_SIZE = 40;

type UpiAppPickerProps = {
  providers: UpiProvider[];
  value: string | null;
  onChange: (providerId: string) => void;
};

/** A grid of UPI apps, each shown with its icon and name. */
export function UpiAppPicker({ providers, value, onChange }: UpiAppPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {providers.map((provider) => {
        const selected = provider.id === value;
        return (
          <Pressable
            key={provider.id}
            onPress={() => onChange(provider.id)}
            accessibilityRole="radio"
            accessibilityLabel={provider.name}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: selected ? theme.text : 'transparent',
              },
              pressed && styles.pressed,
            ]}
          >
            {provider.icon ? (
              <Image
                source={{ uri: provider.icon }}
                style={styles.icon}
                contentFit="contain"
                accessible={false}
              />
            ) : (
              <View style={[styles.icon, styles.fallback, { borderColor: theme.textSecondary }]}>
                <ThemedText type="smallBold" style={styles.fallbackText}>
                  {provider.name.charAt(0)}
                </ThemedText>
              </View>
            )}
            <ThemedText
              type={selected ? 'smallBold' : 'small'}
              numberOfLines={2}
              style={styles.name}
            >
              {provider.name}
            </ThemedText>
            {selected ? (
              <View style={[styles.check, { backgroundColor: theme.text }]}>
                <ThemedText style={[styles.checkText, { color: theme.background }]}>✓</ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: 84,
    minHeight: 88,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 10,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fallbackText: {
    fontSize: 12,
  },
  name: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
});
