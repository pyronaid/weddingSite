import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps the value in this browser, merged with newer defaults', () => {
    const first = renderHook(() => usePersistentState('test', { a: 1 }));
    act(() => first.result.current[1]((current) => ({ ...current, a: 2 })));
    expect(first.result.current[0]).toEqual({ a: 2 });

    const again = renderHook(() => usePersistentState('test', { a: 1, b: 'new' }));
    expect(again.result.current[0]).toEqual({ a: 2, b: 'new' });
  });

  it('works without storage', () => {
    window.localStorage.setItem('wedding.broken', '{not json');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => usePersistentState('broken', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
    act(() => result.current[1]({ a: 3 }));
    expect(result.current[0]).toEqual({ a: 3 });
    spy.mockRestore();
  });
});
