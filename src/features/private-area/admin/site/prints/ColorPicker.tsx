import { useId } from 'react';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import styles from './prints.module.css';

interface ColorPickerProps {
  legend: string;
  value: string;
  onChange: (color: string) => void;
  /** Named swatches: name -> #rrggbb. */
  swatches: Record<string, string>;
  /** Accessible names of the swatches. */
  names: Record<string, string>;
}

/** A palette of swatches, plus any other colour with the browser's picker. */
export function ColorPicker({ legend, value, onChange, swatches, names }: ColorPickerProps) {
  const t = useMessages(printMessages).colours;
  const id = useId();
  const current = value.toLowerCase();
  const isSwatch = Object.values(swatches).some((swatch) => swatch.toLowerCase() === current);
  return (
    <fieldset className={styles.colours}>
      <legend>{legend}</legend>
      {Object.entries(swatches).map(([name, color]) => (
        <label key={name} className={styles.swatch} title={names[name]}>
          <input
            type="radio"
            name={id}
            checked={color.toLowerCase() === current}
            aria-label={names[name]}
            onChange={() => onChange(color)}
          />
          <span style={{ background: color }} aria-hidden="true" />
        </label>
      ))}
      <label className={`${styles.swatch} ${styles.customColour} ${isSwatch ? '' : styles.customOn}`} title={t.custom}>
        <input type="color" value={current} aria-label={t.custom} onChange={(event) => onChange(event.target.value)} />
      </label>
    </fieldset>
  );
}
