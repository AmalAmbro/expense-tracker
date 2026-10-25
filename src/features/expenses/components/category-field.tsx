import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { ControlSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/types/category';

type CategoryValue = { categoryId: string; subcategoryId: string | null };

type CategoryFieldProps = {
  categories: Category[];
  value: CategoryValue;
  onChange: (value: CategoryValue) => void;
  error?: string;
};

export function CategoryField({ categories, value, onChange, error }: CategoryFieldProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [browsingParentId, setBrowsingParentId] = useState<string | null>(null);

  const topLevelCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const selectedCategory = byId.get(value.categoryId);
  const selectedSubcategory = value.subcategoryId ? byId.get(value.subcategoryId) : null;
  const label = selectedCategory
    ? selectedSubcategory
      ? `${selectedCategory.name} → ${selectedSubcategory.name}`
      : selectedCategory.name
    : 'Select category';

  const browsingParent = browsingParentId ? byId.get(browsingParentId) : null;
  const children = browsingParentId
    ? categories.filter((c) => c.parentId === browsingParentId)
    : [];

  function open() {
    setBrowsingParentId(null);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function selectParent(parent: Category) {
    const hasChildren = categories.some((c) => c.parentId === parent.id);
    if (!hasChildren) {
      onChange({ categoryId: parent.id, subcategoryId: null });
      close();
      return;
    }
    setBrowsingParentId(parent.id);
  }

  function selectChild(child: Category) {
    onChange({ categoryId: child.parentId as string, subcategoryId: child.id });
    close();
  }

  function selectParentWithoutSubcategory() {
    if (!browsingParent) return;
    onChange({ categoryId: browsingParent.id, subcategoryId: null });
    close();
  }

  return (
    <View>
      <Pressable onPress={open}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <ThemedText>{label}</ThemedText>
        </ThemedView>
      </Pressable>
      {error ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={isOpen} animationType="slide" onRequestClose={close}>
        <ThemedView style={styles.modal}>
          {browsingParentId ? (
            <>
              <TextButton
                title="← Back"
                onPress={() => setBrowsingParentId(null)}
                style={styles.backRow}
              />
              <Pressable
                onPress={selectParentWithoutSubcategory}
                style={[styles.row, { borderBottomColor: theme.border }]}
              >
                <ThemedText>Just &ldquo;{browsingParent?.name}&rdquo;</ThemedText>
              </Pressable>
              <FlatList
                data={children}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectChild(item)}
                    style={[styles.row, { borderBottomColor: theme.border }]}
                  >
                    <ThemedText>{item.name}</ThemedText>
                  </Pressable>
                )}
              />
            </>
          ) : (
            <FlatList
              data={topLevelCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectParent(item)}
                  style={[styles.row, { borderBottomColor: theme.border }]}
                >
                  <ThemedText>{item.name}</ThemedText>
                </Pressable>
              )}
            />
          )}
          <TextButton title="Cancel" onPress={close} style={styles.closeRow} />
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: ControlSize.height,
    paddingHorizontal: ControlSize.paddingHorizontal,
    justifyContent: 'center',
    borderRadius: Radius.control,
  },
  error: {
    marginTop: Spacing.one,
  },
  modal: {
    flex: 1,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginVertical: Spacing.two,
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
