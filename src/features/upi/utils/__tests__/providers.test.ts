import { providerDisplayName, providerIdForPackage } from '@/features/upi/providers';

describe('providerIdForPackage', () => {
  it('maps well-known packages to short ids and keeps others as-is', () => {
    expect(providerIdForPackage('com.google.android.apps.nbu.paisa.user')).toBe('gpay');
    expect(providerIdForPackage('com.phonepe.app')).toBe('phonepe');
    expect(providerIdForPackage('in.amazon.mShop.android.shopping')).toBe(
      'in.amazon.mShop.android.shopping',
    );
  });
});

describe('providerDisplayName', () => {
  it('names known providers and falls back to the stored id', () => {
    expect(providerDisplayName('gpay')).toBe('Google Pay');
    expect(providerDisplayName('com.example.pay')).toBe('com.example.pay');
    expect(providerDisplayName(null)).toBeNull();
  });
});
