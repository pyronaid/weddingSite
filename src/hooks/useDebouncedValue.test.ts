import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follows the value only once it stops changing for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });
    for (const value of ['g', 'gi', 'giu']) {
      rerender({ value });
      act(() => vi.advanceTimersByTime(200));
    }
    // Still typing: the old value.
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('giu');
  });
});
