import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { migrateDbIfNeeded } from '@/database/migrations';

const DATABASE_NAME = 'expense-tracker.db';

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}
