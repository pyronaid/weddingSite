import { useId, useState, type CSSProperties } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../i18n';
import { toAdminError } from '../../../../services/admin';
import {
  contrastProblems,
  DEFAULT_PALETTE,
  isHexColor,
  PALETTE_PRESET_IDS,
  PALETTE_PRESETS,
  paletteStyle,
  samePalette,
  type Palette,
  type PaletteKey,
} from '../../../../theme/palette';
import { paletteMessages } from '../../messages/palette';
import styles from './site.module.css';

/** The colours, by what they paint. */
const GROUPS: { id: 'page' | 'accents' | 'cards'; keys: PaletteKey[] }[] = [
  { id: 'page', keys: ['pageEdge', 'pageBand', 'pageLight', 'text'] },
  { id: 'accents', keys: ['accent', 'accentStrong'] },
  { id: 'cards', keys: ['cardBg', 'cardText', 'cardMuted', 'cardAccent'] },
];

type Status = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string };

interface PaletteEditorProps {
  /** The colours the site has now. */
  saved: Palette;
  /** Resolves with the colours as saved (normalised by the server). */
  onSave: (palette: Palette) => Promise<Palette>;
}

/**
 * Super admins: the colours of the whole site. Changes show in the preview
 * only (its own copy of the colours) until they are saved; then the whole
 * site, this page included, takes them at once.
 */
export function PaletteEditor({ saved, onSave }: PaletteEditorProps) {
  const t = useMessages(paletteMessages);
  const id = useId();
  const [draft, setDraft] = useState<Palette>(saved);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const dirty = !samePalette(draft, saved);
  const problems = contrastProblems(draft);

  const edit = (next: Palette) => {
    setDraft(next);
    if (status.state !== 'saving') setStatus({ state: 'idle' });
  };

  const save = async () => {
    if (status.state === 'saving') return;
    setStatus({ state: 'saving' });
    try {
      setDraft(await onSave(draft));
      setStatus({ state: 'saved' });
    } catch (reason) {
      setStatus({ state: 'error', message: toAdminError(reason).message });
    }
  };

  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.sectionTitle}>
        {t.title}
      </h3>
      <p className={formStyles.hint}>{t.hint}</p>

      <div className={styles.paletteLayout}>
        <div className={styles.paletteControls}>
          <fieldset className={styles.palettePresets}>
            <legend>{t.presets}</legend>
            {PALETTE_PRESET_IDS.map((preset) => {
              const colours = PALETTE_PRESETS[preset];
              return (
                <button
                  key={preset}
                  type="button"
                  className={styles.palettePreset}
                  aria-pressed={samePalette(draft, colours)}
                  onClick={() => edit(colours)}
                >
                  <span className={styles.paletteStrip} aria-hidden="true">
                    {(['pageEdge', 'pageLight', 'accentStrong', 'cardBg', 'cardAccent'] as const).map((key) => (
                      <span key={key} style={{ background: colours[key] }} />
                    ))}
                  </span>
                  {t.presetNames[preset]}
                </button>
              );
            })}
          </fieldset>

          {GROUPS.map((group) => (
            <fieldset key={group.id} className={styles.paletteGroup}>
              <legend>{t.groups[group.id]}</legend>
              {group.keys.map((key) => (
                <ColourField
                  key={key}
                  id={`${id}-${key}`}
                  label={t.colours[key]}
                  codeLabel={t.code(t.colours[key])}
                  value={draft[key]}
                  onChange={(value) => edit({ ...draft, [key]: value })}
                />
              ))}
            </fieldset>
          ))}
        </div>

        <div className={styles.paletteSide}>
          <h4 className={styles.paletteHeading}>{t.preview}</h4>
          {/* The draft's colours on this element only: the rest of the page keeps the saved ones. */}
          <div
            className={styles.palettePreview}
            style={paletteStyle(draft) as CSSProperties}
            data-testid="palette-preview"
          >
            <p className={styles.previewTitle}>{t.sample.title}</p>
            <p className={styles.previewText}>{t.sample.text}</p>
            <div className={styles.previewCard}>
              <p className={styles.previewCardTitle}>{t.sample.cardTitle}</p>
              <p className={styles.previewCardText}>{t.sample.cardText}</p>
              <p className={styles.previewCardMuted}>{t.sample.cardMuted}</p>
              <span className={styles.previewButton}>{t.sample.cardAccent}</span>
            </div>
          </div>

          <div role="status" className={styles.paletteContrast}>
            {problems.length === 0 ? (
              <p className={styles.saved}>{t.contrastOk}</p>
            ) : (
              <>
                <p className={styles.paletteWarningTitle}>{t.contrastTitle}</p>
                <ul>
                  {problems.map((problem) => (
                    <li key={problem.id}>{t.contrastLine(t.contrast[problem.id], problem.ratio, problem.min)}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.paletteActions}>
        <button
          type="button"
          className={formStyles.submit}
          disabled={!dirty || status.state === 'saving'}
          onClick={() => void save()}
        >
          {status.state === 'saving' ? t.saving : t.save}
        </button>
        {dirty && (
          <button type="button" className={formStyles.textButton} onClick={() => edit(saved)}>
            {t.undo}
          </button>
        )}
        {!samePalette(draft, DEFAULT_PALETTE) && (
          <button type="button" className={formStyles.textButton} onClick={() => edit(DEFAULT_PALETTE)}>
            {t.original}
          </button>
        )}
      </div>
      <p role="status" className={dirty ? formStyles.hint : styles.saved}>
        {dirty ? t.unsaved : status.state === 'saved' ? t.saved : ''}
      </p>
      {status.state === 'error' && (
        <p role="alert" className={formStyles.submitError}>
          {status.message}
        </p>
      )}
    </section>
  );
}

interface ColourFieldProps {
  id: string;
  label: string;
  codeLabel: string;
  value: string;
  onChange: (value: string) => void;
}

/** A colour: the browser's picker, and its code to type or paste ("#rrggbb"). */
function ColourField({ id, label, codeLabel, value, onChange }: ColourFieldProps) {
  // What is being typed, while it is not a whole colour yet. Shown only as long
  // as it belongs to the current colour: a preset or the picker replace it.
  const [typed, setTyped] = useState<{ text: string; for: string } | null>(null);
  const text = typed && typed.for === value ? typed.text : value;

  return (
    <div className={styles.colourField}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="color"
        className={styles.colourSwatch}
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
      />
      <input
        type="text"
        className={styles.colourCode}
        aria-label={codeLabel}
        value={text}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={!isHexColor(text)}
        onChange={(event) => {
          const next = event.target.value.trim();
          const colour = next.startsWith('#') ? next : `#${next}`;
          if (isHexColor(colour)) {
            onChange(colour.toLowerCase());
            setTyped({ text: next, for: colour.toLowerCase() });
          } else {
            setTyped({ text: next, for: value });
          }
        }}
      />
    </div>
  );
}
