import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryRow } from '@/database/schema/tables';
import type { Category } from '@/types/category';

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    type: row.type,
    isEssentialDefault: row.is_essential_default === 1,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

export function createCategoryRepository(db: SQLiteDatabase) {
  return {
    async list(): Promise<Category[]> {
      const rows = await db.getAllAsync<CategoryRow>(
        'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC',
      );
      return rows.map(toCategory);
    },

    async getById(id: string): Promise<Category | null> {
      const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
      return row ? toCategory(row) : null;
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
