import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';

import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { ControlSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FilterOption<T> = { value: T; label: string };

type FilterChipProps<T> = {
  /** Describes what the chip filters, for screen readers and the picker heading. */
  name: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Whether the current value narrows the list (drawn with a selected background). */
  isActive: boolean;
};

/** A compact button showing the current filter value; tapping it opens a list of options. */
export function FilterChip<T>({ name, options, value, onChange, isActive }: FilterChipProps<T>) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  function select(option: FilterOption<T>) {
    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${selected?.label ?? ''}`}
        accessibilityState={{ selected: isActive }}
      >
        <ThemedView
          type={isActive ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.chip}
        >
          <ThemedText type={isActive ? 'smallBold' : 'small'}>
            {selected?.label ?? name} ▾
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <ThemedView style={styles.modal}>
          <ThemedText type="smallBold" style={styles.heading}>
            {name}
          </ThemedText>
          <FlatList
            data={options}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => select(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
                style={[styles.row, { borderBottomColor: theme.border }]}
              >
                <ThemedText type={item.value === value ? 'smallBold' : 'default'}>
                  {item.value === value ? '✓ ' : ''}
                  {item.label}
                </ThemedText>
              </Pressable>
            )}
          />
          <TextButton title="Cancel" onPress={() => setIsOpen(false)} style={styles.closeRow} />
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: ControlSize.compactHeight,
    justifyContent: 'center',
    paddingHorizontal: ControlSize.paddingHorizontal,
    borderRadius: Radius.control,
  },
  modal: {
    flex: 1,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  heading: {
    paddingBottom: Spacing.two,
  },
  row: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeRow: {
    alignSelf: 'center',
    marginVertical: Spacing.three,
  },
});
