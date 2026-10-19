import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/** Distance from the viewport edge (px) where dragging scrolls the page. */
const SCROLL_EDGE = 60;
const SCROLL_STEP = 12;

/**
 * Reorders the rows of a list by dragging a handle (mouse or touch, with
 * pointer events) or with the arrow keys on the focused handle.
 *
 * The list is reordered live: as the pointer passes the middle of the next
 * row, `onMove(from, to)` is called and the dragged row takes its place.
 * The rows must be the direct children of the element given to `listRef`,
 * keyed by a stable id so the dragged row (and its focus) survives a move.
 */
export function useReorder<T extends HTMLElement>(count: number, onMove: (from: number, to: number) => void) {
  const listRef = useRef<T>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const rowRect = (index: number) => listRef.current?.children[index]?.getBoundingClientRect();
  const middle = (index: number) => {
    const rect = rowRect(index);
    return rect ? rect.top + rect.height / 2 : 0;
  };

  const handleProps = (index: number) => ({
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      event.preventDefault(); // no text selection, no focus jump
      // Keeps receiving the moves even when the pointer leaves the handle.
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(index);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (dragging === null) return;
      const y = event.clientY;
      // Past the middle of the neighbour: swap with it (the middle, not the
      // edge, so rows of different heights do not flicker back and forth).
      let target = dragging;
      while (target > 0 && y < middle(target - 1)) target -= 1;
      while (target < count - 1 && y > middle(target + 1)) target += 1;
      if (target !== dragging) {
        onMove(dragging, target);
        setDragging(target);
      }
      if (y < SCROLL_EDGE) window.scrollBy(0, -SCROLL_STEP);
      else if (y > window.innerHeight - SCROLL_EDGE) window.scrollBy(0, SCROLL_STEP);
    },
    onPointerUp() {
      setDragging(null);
    },
    onPointerCancel() {
      setDragging(null);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : null;
      if (to === null || to < 0 || to >= count) return;
      event.preventDefault();
      onMove(index, to);
    },
  });

  return { listRef, dragging, handleProps };
}

/** A copy of `items` with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
