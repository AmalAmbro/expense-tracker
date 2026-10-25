import { StyleSheet, View } from 'react-native';

import { TextButton } from '@/components/ui/text-button';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BulkDraft } from '@/features/bulk-entry/utils/bulk-drafts';
import { CategoryField } from '@/features/expenses/components/category-field';
import { formatPaise } from '@/utils/money';
import type { Category } from '@/types/category';

type BulkDraftRowProps = {
  draft: BulkDraft;
  categories: Category[];
  onChangeCategory: (value: { categoryId: string; subcategoryId: string | null }) => void;
  onRemove: () => void;
};

export function BulkDraftRow({ draft, categories, onChangeCategory, onRemove }: BulkDraftRowProps) {
  const theme = useTheme();
  const amount = formatPaise(draft.amount);

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={styles.description} numberOfLines={1}>
          {draft.description}
        </ThemedText>
        <ThemedText style={styles.amount}>{amount}</ThemedText>
      </View>
      <CategoryField
        categories={categories}
        value={{ categoryId: draft.categoryId ?? '', subcategoryId: draft.subcategoryId }}
        onChange={onChangeCategory}
        error={draft.categoryId === null ? 'Needs category' : undefined}
      />
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          Line {draft.lineNumber}
        </ThemedText>
        <TextButton
          title="Remove"
          variant="destructive"
          onPress={onRemove}
          accessibilityLabel={`Remove ${draft.description}, ${amount}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  description: {
    flex: 1,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
