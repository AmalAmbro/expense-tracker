import type { SQLiteDatabase } from 'expo-sqlite';

import type { PaymentMethodRow } from '@/database/schema/tables';
import type { PaymentMethod } from '@/types/payment-method';

function toPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

export function createPaymentMethodRepository(db: SQLiteDatabase) {
  return {
    async list(): Promise<PaymentMethod[]> {
      const rows = await db.getAllAsync<PaymentMethodRow>(
        'SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC',
      );
      return rows.map(toPaymentMethod);
    },

    /** Every payment method, including inactive ones (e.g. for backups). */
    async listAll(): Promise<PaymentMethod[]> {
      const rows = await db.getAllAsync<PaymentMethodRow>(
        'SELECT * FROM payment_methods ORDER BY sort_order ASC',
      );
      return rows.map(toPaymentMethod);
    },
  };
}

export type PaymentMethodRepository = ReturnType<typeof createPaymentMethodRepository>;
