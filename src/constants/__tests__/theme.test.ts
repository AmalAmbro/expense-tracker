import { Colors } from '@/constants/theme';

describe('Colors theme', () => {
  it('defines the same set of keys for light and dark', () => {
    expect(Object.keys(Colors.light).sort()).toEqual(Object.keys(Colors.dark).sort());
  });
});
