import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LetterInputs } from './LetterInputs';

function Harness({ length = 5 }: { length?: number }) {
  const [values, setValues] = useState(() => Array.from({ length }, () => ''));
  return (
    <>
      <LetterInputs values={values} onChange={setValues} />
      <output>{values.map((v) => v || '_').join('')}</output>
    </>
  );
}

const box = (n: number) => screen.getByRole('textbox', { name: `Letter ${n} of 5` });
const answer = () => screen.getByRole('status').textContent;

describe('LetterInputs', () => {
  it('moves the focus to the next box after each letter, uppercasing it', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(1));
    await user.keyboard('apple');
    expect(answer()).toBe('APPLE');
    expect(box(5)).toHaveFocus();
  });

  it('ignores characters that are not letters or digits', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(1));
    await user.keyboard('a- 1');
    expect(answer()).toBe('A1___');
    expect(box(3)).toHaveFocus();
  });

  it('goes back with Backspace on an empty box, clearing the previous letter', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(1));
    await user.keyboard('ab');
    expect(box(3)).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(answer()).toBe('A____');
    expect(box(2)).toHaveFocus();
  });

  it('replaces a letter when typing over a filled box', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(1));
    await user.keyboard('abc');
    await user.click(box(2));
    await user.keyboard('x');
    expect(answer()).toBe('AXC__');
    expect(box(3)).toHaveFocus();
  });

  it('moves on when retyping the letter a box already holds', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(1));
    await user.keyboard('maria');
    // Back to the start to correct the word: the first letter stays the same.
    await user.click(box(1));
    await user.keyboard('mario');
    expect(answer()).toBe('MARIO');
    expect(box(5)).toHaveFocus();
  });

  it('moves with the arrow keys', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(3));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(box(1)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(box(2)).toHaveFocus();
  });

  it('spreads a pasted answer over the boxes', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(box(2));
    await user.paste('p-ple and more');
    expect(answer()).toBe('_PPLE');
    expect(box(5)).toHaveFocus();
  });
});
