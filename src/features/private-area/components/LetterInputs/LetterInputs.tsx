import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { normalizeAnswer } from '../../../../services/game';
import styles from './LetterInputs.module.css';

interface LetterInputsProps {
  /** One character per box; '' for empty boxes. Its length sets the number of boxes. */
  values: readonly string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Id of the element describing the inputs (e.g. the error message). */
  describedBy?: string;
  /** Names the boxes for screen readers ("Surname letter 1 of 7"), when there are several rows. */
  label?: string;
}

/**
 * One box per character of the answer.
 * - typing a letter fills the box and moves the focus to the next one (also
 *   when it is the letter already there, e.g. retyping a word from the start)
 * - Backspace on an empty box clears the previous one and moves back
 * - arrows move between boxes; pasting fills the boxes from the current one
 * Only letters and digits are accepted, always shown uppercase.
 */
export function LetterInputs({ values, onChange, disabled, invalid, describedBy, label }: LetterInputsProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const count = values.length;

  const focus = (index: number) => {
    const input = inputs.current[Math.max(0, Math.min(count - 1, index))];
    input?.focus();
    input?.select();
  };

  /** Writes `chars` starting at `index`, then focuses the box after the last one written. */
  const fill = (index: number, chars: string) => {
    if (!chars) return;
    const next = [...values];
    const written = [...chars].slice(0, count - index);
    written.forEach((char, offset) => {
      next[index + offset] = char;
    });
    onChange(next);
    focus(index + written.length);
  };

  const handleInput = (index: number, raw: string) => {
    const chars = normalizeAnswer(raw);
    if (!raw) {
      // Cleared (e.g. selection deleted): keep the focus here.
      const next = [...values];
      next[index] = '';
      onChange(next);
      return;
    }
    // Typing into a filled box gives old + new (or new + old, depending on
    // the caret): keep the new character.
    const previous = values[index];
    const typed = previous && chars.length === 2 ? (chars[0] === previous ? chars[1] : chars[0]) : chars;
    fill(index, typed);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !values[index] && index > 0) {
      event.preventDefault();
      const next = [...values];
      next[index - 1] = '';
      onChange(next);
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(index, normalizeAnswer(event.clipboardData.getData('text')));
  };

  return (
    <div className={styles.row}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          className={`${styles.box} ${value ? styles.filled : ''}`}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint={index === count - 1 ? 'done' : 'next'}
          value={value}
          disabled={disabled}
          aria-label={`${label ? `${label} letter` : 'Letter'} ${index + 1} of ${count}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => handleInput(index, event.target.value)}
          // Typing over a box the same letter it already holds leaves the
          // value unchanged, so onChange does not fire: still move on.
          onInput={(event) => {
            if (value && normalizeAnswer(event.currentTarget.value) === value) focus(index + 1);
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
