import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import type { PaymentMethod } from '@/types/payment-method';

type PaymentMethodFieldProps = {
  paymentMethods: PaymentMethod[];
  value: string;
  onChange: (paymentMethodId: string) => void;
  error?: string;
};

export function PaymentMethodField({
  paymentMethods,
  value,
  onChange,
  error,
}: PaymentMethodFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = paymentMethods.find((method) => method.id === value);

  function select(method: PaymentMethod) {
    onChange(method.id);
    setIsOpen(false);
  }

  return (
    <View>
      <Pressable onPress={() => setIsOpen(true)}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <ThemedText>{selected?.name ?? 'Select payment method'}</ThemedText>
        </ThemedView>
      </Pressable>
      {error ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <ThemedView style={styles.modal}>
          <FlatList
            data={paymentMethods}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => select(item)} style={styles.row}>
                <ThemedText>{item.name}</ThemedText>
              </Pressable>
            )}
          />
          <Pressable onPress={() => setIsOpen(false)} style={styles.closeRow}>
            <ThemedText type="link">Cancel</ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  error: {
    marginTop: Spacing.one,
  },
  modal: {
    flex: 1,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  row: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  closeRow: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
