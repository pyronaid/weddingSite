import { useEffect, useId, useState, type ReactNode } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { BORDER_STYLES, borderLabel } from '../../../../../brand/borders';
import { loadGlyphFonts } from '../../../../../brand/glyphs';
import {
  ARRANGEMENTS,
  DEFAULT_MONOGRAM,
  MONOGRAM_FONTS,
  monogramParts,
  monogramSvg,
  SEPARATORS,
  type GlyphFonts,
  type MonogramDesign,
} from '../../../../../brand/monogram';
import { useMessages } from '../../../../../i18n';
import { download, svgToPng } from '../../../../../prints/output';
import { printMessages, SWATCHES } from '../../../messages/prints';
import { ColorPicker } from './ColorPicker';
import { ExportButton } from './ExportButton';
import styles from './prints.module.css';
import { SaveStatus } from './SaveStatus';
import { useLogoDesign } from './useLogoDesign';

const PNG_WIDTH = 2048;

/** A monogram drawn inline (ids made unique: several are on the page). */
function Monogram({
  design,
  fonts,
  id,
  label,
}: {
  design: MonogramDesign;
  fonts: GlyphFonts;
  id: string;
  label?: string;
}) {
  const { viewBox, body } = monogramParts(design, fonts, id);
  return (
    <svg viewBox={viewBox} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {/* Our own SVG: letters are outlines, every text escaped. */}
      <g dangerouslySetInnerHTML={{ __html: body }} />
    </svg>
  );
}

/** A choice shown as a small preview of the logo with that option. */
function ChoiceCards<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  labels,
  preview,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels: Record<T, string>;
  preview?: (option: T) => ReactNode;
}) {
  return (
    <fieldset className={styles.choices}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option} className={`${styles.choice} ${preview ? styles.choiceCard : ''}`}>
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          {preview && <span className={styles.thumb}>{preview(option)}</span>}
          <span>{labels[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The logo designer: two letters, their colours, how they are arranged, an
 * optional separator, the font and a border. The preview follows every
 * choice; SVG (vector) and PNG downloads.
 */
export function LogoDesigner() {
  const t = useMessages(printMessages);
  const l = t.logo;
  const id = useId().replace(/:/g, '');
  const { design, setDesign, status, error, retry } = useLogoDesign();
  const [fonts, setFonts] = useState<GlyphFonts | null>(null);
  const [failed, setFailed] = useState(false);
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    loadGlyphFonts().then(
      (loaded) => current && setFonts(loaded),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, []);

  if (failed) {
    return (
      <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
        {t.failed}
      </div>
    );
  }
  if (!design || !fonts) {
    return status === 'error' ? (
      <SaveStatus status={status} error={error} onRetry={retry} />
    ) : (
      <p role="status" className={formStyles.hint}>
        {fonts ? t.saving.loading : l.loading}
      </p>
    );
  }

  const change = (changes: Partial<MonogramDesign>) => setDesign((current) => ({ ...current, ...changes }));
  const setLetter = (index: 0 | 1, value: string) => {
    const letters: [string, string] = [...design.letters];
    // The last typed character, upper case.
    letters[index] = [...value.trim()].slice(-1).join('').toLocaleUpperCase();
    change({ letters });
  };
  const setColor = (index: 0 | 1, color: string) => {
    const colors: [string, string] = [...design.colors];
    colors[index] = color;
    change({ colors });
  };

  const letters = design.letters.filter(Boolean).join(' ');
  const name = l.name(letters);
  const file = `logo-${design.letters.join('').toLowerCase() || 'monogram'}`;
  const spaced = design.arrangement !== 'crossed';

  const svg = monogramSvg(design, fonts, { title: name });
  const exportPng = async () => {
    setBusy('png');
    try {
      download(`${file}.png`, await svgToPng(svg, PNG_WIDTH));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={styles.group} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className={styles.title}>
        {l.title}
      </h4>
      <p className={formStyles.hint}>{l.hint}</p>

      <div className={styles.designer}>
        <div className={styles.previewColumn}>
          <div className={`${styles.logoPreview} ${dark ? styles.dark : ''}`}>
            <Monogram design={design} fonts={fonts} id={`${id}-preview`} label={name} />
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />
            {l.background} {l.backgrounds.dark}
          </label>
          <SaveStatus status={status} error={error} onRetry={retry} />
          <div className={styles.actions}>
            <ExportButton label={t.svg} item={name} busy={busy} id="svg" onClick={() => download(`${file}.svg`, svg)} />
            <ExportButton label={t.png} item={name} busy={busy} id="png" onClick={() => void exportPng()} />
            <button type="button" className={formStyles.textButton} onClick={() => setDesign(DEFAULT_MONOGRAM)}>
              {l.reset}
            </button>
          </div>
        </div>

        <div className={styles.options}>
          <fieldset className={styles.letters}>
            <legend>{l.letters}</legend>
            {([0, 1] as const).map((index) => (
              <div key={index} className={styles.letterRow}>
                <div className={formStyles.field}>
                  <label htmlFor={`${id}-letter-${index}`}>{index === 0 ? l.first : l.second}</label>
                  <input
                    id={`${id}-letter-${index}`}
                    className={styles.letterInput}
                    value={design.letters[index]}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(event) => setLetter(index, event.target.value)}
                  />
                </div>
                <ColorPicker
                  legend={index === 0 ? l.firstColour : l.secondColour}
                  value={design.colors[index]}
                  onChange={(color) => setColor(index, color)}
                  swatches={SWATCHES}
                  names={t.colours.names}
                />
              </div>
            ))}
          </fieldset>

          <ChoiceCards
            legend={l.arrangement}
            name={`${id}-arrangement`}
            options={ARRANGEMENTS}
            value={design.arrangement}
            onChange={(arrangement) => change({ arrangement })}
            labels={l.arrangements}
            preview={(arrangement) => (
              <Monogram
                design={{ ...design, arrangement, border: 'none' }}
                fonts={fonts}
                id={`${id}-a-${arrangement}`}
              />
            )}
          />

          <fieldset className={styles.choices}>
            <legend>{l.separator}</legend>
            {spaced ? (
              <>
                {SEPARATORS.map((separator) => (
                  <label key={separator} className={styles.choice}>
                    <input
                      type="radio"
                      name={`${id}-separator`}
                      checked={design.separator === separator}
                      aria-label={l.separatorNames[separator]}
                      onChange={() => change({ separator })}
                    />
                    <span className={styles.separatorSample}>{l.separators[separator]}</span>
                  </label>
                ))}
                {design.separator === 'custom' && (
                  <div className={`${formStyles.field} ${styles.customSeparator}`}>
                    <label htmlFor={`${id}-custom`}>{l.customSeparator}</label>
                    <input
                      id={`${id}-custom`}
                      value={design.customSeparator}
                      maxLength={3}
                      autoComplete="off"
                      onChange={(event) => change({ customSeparator: event.target.value })}
                    />
                  </div>
                )}
                {design.separator !== 'none' && (
                  <ColorPicker
                    legend={l.separatorColour}
                    value={design.separatorColor}
                    onChange={(separatorColor) => change({ separatorColor })}
                    swatches={SWATCHES}
                    names={t.colours.names}
                  />
                )}
              </>
            ) : (
              <p className={formStyles.hint}>{l.separatorWhenSpaced}</p>
            )}
          </fieldset>

          <ChoiceCards
            legend={l.font}
            name={`${id}-font`}
            options={MONOGRAM_FONTS}
            value={design.font}
            onChange={(font) => change({ font })}
            labels={l.fonts}
            preview={(font) => (
              <Monogram design={{ ...design, font, border: 'none' }} fonts={fonts} id={`${id}-f-${font}`} />
            )}
          />

          <ChoiceCards
            legend={l.border}
            name={`${id}-border`}
            options={BORDER_STYLES}
            value={design.border}
            onChange={(border) => change({ border })}
            labels={Object.fromEntries(BORDER_STYLES.map((id) => [id, id === 'none' ? l.noBorder : borderLabel(id)]))}
            preview={(border) => <Monogram design={{ ...design, border }} fonts={fonts} id={`${id}-b-${border}`} />}
          />
          {design.border !== 'none' && (
            <ColorPicker
              legend={l.borderColour}
              value={design.borderColor}
              onChange={(borderColor) => change({ borderColor })}
              swatches={SWATCHES}
              names={t.colours.names}
            />
          )}
        </div>
      </div>
    </section>
  );
}
