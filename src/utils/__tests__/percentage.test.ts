import { formatShare } from '@/utils/percentage';

describe('formatShare', () => {
  it('formats with one decimal place, dropping a trailing .0', () => {
    expect(formatShare(514150, 1275950)).toBe('40.3%');
    expect(formatShare(50, 100)).toBe('50%');
    expect(formatShare(1, 3)).toBe('33.3%');
  });

  it('returns 0% when the whole is zero', () => {
    expect(formatShare(0, 0)).toBe('0%');
  });
});
