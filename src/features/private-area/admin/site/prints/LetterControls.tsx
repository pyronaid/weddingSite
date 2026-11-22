import { ADJUST, type LetterAdjustment } from '../../../../../brand/monogram';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import { NudgeControls } from './NudgeControls';

interface LetterControlsProps {
  letter: 0 | 1;
  adjustment: LetterAdjustment;
  /** Asks for a change: the designer applies it only if the letter stays inside the area. */
  onAdjust: (next: LetterAdjustment) => void;
}

/** The buttons that move a letter of the logo and change its size (limits: ADJUST). */
export function LetterControls({ letter, adjustment, onAdjust }: LetterControlsProps) {
  const t = useMessages(printMessages).logo.adjust;
  return <NudgeControls which={t.which[letter]} value={adjustment} limits={ADJUST} labels={t} onChange={onAdjust} />;
}
