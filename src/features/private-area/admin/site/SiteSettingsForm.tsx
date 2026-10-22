import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { LANGUAGES, useMessages, type Language } from '../../../../i18n';
import { isValidIban } from '../../../../lib/format';
import { toAdminError } from '../../../../services/admin';
import {
  isTimeZone,
  isoToLocalInput,
  localInputToIso,
  type SiteContent,
  type SiteSettings,
  type Venue,
} from '../../../../services/site';
import { siteSettingsMessages } from '../../messages/siteSettings';
import styles from './site.module.css';

/** The form keeps plain strings; errors are keyed by the PocketBase field names. */
interface Draft {
  language: Language;
  partner_one: string;
  partner_two: string;
  hashtag: string;
  tagline: string;
  /** "2027-06-19T16:00", wall-clock time in `timezone`. */
  date: string;
  timezone: string;
  rsvp_deadline: string;
  ceremony_name: string;
  ceremony_address: string;
  ceremony_time: string;
  ceremony_map: string;
  has_reception: boolean;
  reception_name: string;
  reception_address: string;
  reception_time: string;
  reception_map: string;
  gift_message: string;
  account_holder: string;
  iban: string;
  bic: string;
  bank_name: string;
  payment_reason: string;
}

type TextKey = Exclude<keyof Draft, 'language' | 'has_reception'>;
type Errors = Partial<Record<keyof Draft, string>>;

/** The map query is stored only when it differs from the address. */
const mapOf = (venue: Venue | null) => (venue && venue.mapQuery !== venue.address ? venue.mapQuery : '');

function toDraft(content: SiteContent): Draft {
  const { couple, ceremony, reception, gift } = content;
  return {
    language: content.language,
    partner_one: couple.partnerOne,
    partner_two: couple.partnerTwo,
    hashtag: couple.hashtag,
    tagline: content.tagline,
    date: isoToLocalInput(content.date, content.timezone),
    timezone: content.timezone,
    rsvp_deadline: content.rsvpDeadline,
    ceremony_name: ceremony.name,
    ceremony_address: ceremony.address,
    ceremony_time: ceremony.time,
    ceremony_map: mapOf(ceremony),
    has_reception: reception !== null,
    reception_name: reception?.name ?? '',
    reception_address: reception?.address ?? '',
    reception_time: reception?.time ?? '',
    reception_map: mapOf(reception),
    gift_message: gift.message,
    account_holder: gift.accountHolder,
    iban: gift.iban,
    bic: gift.bic,
    bank_name: gift.bankName,
    payment_reason: gift.paymentReason,
  };
}

function toSettings(draft: Draft): SiteSettings {
  const clean = (key: TextKey) => draft[key].trim();
  const venue = (prefix: 'ceremony' | 'reception'): Venue => ({
    name: clean(`${prefix}_name`),
    address: clean(`${prefix}_address`),
    time: draft[`${prefix}_time`],
    mapQuery: clean(`${prefix}_map`) || clean(`${prefix}_address`),
  });
  return {
    language: draft.language,
    couple: { partnerOne: clean('partner_one'), partnerTwo: clean('partner_two'), hashtag: clean('hashtag') },
    tagline: clean('tagline'),
    date: localInputToIso(draft.date, clean('timezone')),
    timezone: clean('timezone'),
    rsvpDeadline: draft.rsvp_deadline,
    ceremony: venue('ceremony'),
    reception: draft.has_reception ? venue('reception') : null,
    gift: {
      message: clean('gift_message'),
      accountHolder: clean('account_holder'),
      iban: clean('iban'),
      bic: clean('bic'),
      bankName: clean('bank_name'),
      paymentReason: clean('payment_reason'),
    },
  };
}

const REQUIRED: TextKey[] = [
  'partner_one',
  'partner_two',
  'date',
  'timezone',
  'rsvp_deadline',
  'ceremony_name',
  'ceremony_address',
  'ceremony_time',
  'account_holder',
  'iban',
];
const RECEPTION_REQUIRED: TextKey[] = ['reception_name', 'reception_address', 'reception_time'];

/** The browser's list of time zones, for the suggestions. */
const TIME_ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
})();

interface SiteSettingsFormProps {
  content: SiteContent;
  /** Resolves with the content as saved (normalised by the server). */
  onSave: (settings: SiteSettings) => Promise<SiteContent>;
}

/** Language, names, date, venues and gift details of the public site. */
export function SiteSettingsForm({ content, onSave }: SiteSettingsFormProps) {
  const t = useMessages(siteSettingsMessages);
  const uid = useId();
  const initial = useMemo(() => toDraft(content), [content]);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string }>({
    state: 'idle',
  });
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const id = (key: keyof Draft) => `${uid}-${key}`;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors(({ [key]: _fixed, ...rest }) => rest);
    setStatus({ state: 'idle' });
  };

  const validate = (): Errors => {
    const found: Errors = {};
    const required = [...REQUIRED, ...(draft.has_reception ? RECEPTION_REQUIRED : [])];
    for (const key of required) if (!draft[key].trim()) found[key] = t.validation.required;
    if (!found.iban && !isValidIban(draft.iban)) found.iban = t.validation.iban;
    if (!found.timezone && !isTimeZone(draft.timezone.trim())) found.timezone = t.validation.timezone;
    if (!found.date && !found.timezone && !localInputToIso(draft.date, draft.timezone.trim())) found.date = t.validation.date;
    return found;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.state === 'saving') return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // The first wrong field on screen gets the focus.
      const wrong = new Set(Object.keys(found).map((key) => id(key as keyof Draft)));
      const first = Array.from(event.currentTarget.elements).find((element) => wrong.has(element.id));
      (first as HTMLElement | undefined)?.focus();
      return;
    }
    setStatus({ state: 'saving' });
    try {
      const saved = await onSave(toSettings(draft));
      // The server normalises some values (IBAN without spaces...): show them.
      setDraft(toDraft(saved));
      setStatus({ state: 'saved' });
    } catch (reason) {
      const failure = toAdminError(reason);
      setErrors(failure.fieldErrors as Errors);
      setStatus({ state: 'error', message: failure.message });
    }
  };

  /** A labelled input bound to a draft field, with its error. */
  const field = (
    key: TextKey,
    label: string,
    options: { type?: string; placeholder?: string; hint?: string; list?: string; maxLength?: number; wide?: boolean } = {},
  ): ReactNode => {
    const hintId = options.hint ? `${id(key)}-hint` : undefined;
    const errorId = errors[key] ? `${id(key)}-error` : undefined;
    return (
      <div className={`${formStyles.field} ${options.wide ? styles.wide : ''}`}>
        <label htmlFor={id(key)}>{label}</label>
        {key === 'gift_message' ? (
          <textarea
            id={id(key)}
            rows={3}
            maxLength={options.maxLength}
            value={draft[key]}
            aria-invalid={!!errors[key]}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            onChange={(event) => set(key, event.target.value)}
          />
        ) : (
          <input
            id={id(key)}
            type={options.type ?? 'text'}
            list={options.list}
            maxLength={options.maxLength}
            placeholder={options.placeholder}
            autoComplete="off"
            value={draft[key]}
            aria-invalid={!!errors[key]}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            onChange={(event) => set(key, event.target.value)}
          />
        )}
        {options.hint && (
          <span id={hintId} className={formStyles.hint}>
            {options.hint}
          </span>
        )}
        {errors[key] && (
          <span id={errorId} className={formStyles.error}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  };

  const venueFields = (prefix: 'ceremony' | 'reception') => (
    <div className={styles.grid}>
      {field(`${prefix}_name`, t.venue.name, { maxLength: 120 })}
      {field(`${prefix}_time`, t.venue.time, { type: 'time' })}
      {field(`${prefix}_address`, t.venue.address, { maxLength: 200, wide: true })}
      {field(`${prefix}_map`, t.venue.map, { maxLength: 200, placeholder: t.venue.mapPlaceholder, wide: true })}
    </div>
  );

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.section}>
        <legend>{t.language.legend}</legend>
        <div className={styles.choices}>
          {LANGUAGES.map((language) => (
            <label key={language} className={styles.choice}>
              <input
                type="radio"
                name={`${uid}-language`}
                value={language}
                checked={draft.language === language}
                onChange={() => set('language', language)}
              />
              <span lang={language}>{t.language.names[language]}</span>
            </label>
          ))}
        </div>
        <p className={formStyles.hint}>{t.language.hint}</p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>{t.couple.legend}</legend>
        <div className={styles.grid}>
          {field('partner_one', t.couple.partnerOne, { maxLength: 60 })}
          {field('partner_two', t.couple.partnerTwo, { maxLength: 60 })}
          {field('tagline', t.couple.tagline, { maxLength: 120, placeholder: t.couple.taglinePlaceholder })}
          {field('hashtag', t.couple.hashtag, { maxLength: 60, placeholder: t.couple.hashtagPlaceholder })}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>{t.date.legend}</legend>
        <div className={styles.grid}>
          {field('date', t.date.dateTime, { type: 'datetime-local' })}
          {field('rsvp_deadline', t.date.deadline, { type: 'date' })}
          {field('timezone', t.date.timezone, { list: `${uid}-zones`, hint: t.date.timezoneHint, wide: true })}
        </div>
        <datalist id={`${uid}-zones`}>
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>{t.venue.ceremony}</legend>
        {venueFields('ceremony')}
      </fieldset>

      <fieldset className={styles.section}>
        <legend>{t.venue.reception}</legend>
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={draft.has_reception}
            onChange={(event) => set('has_reception', event.target.checked)}
          />
          <span>{t.venue.hasReception}</span>
        </label>
        {draft.has_reception && venueFields('reception')}
      </fieldset>

      <fieldset className={styles.section}>
        <legend>{t.gift.legend}</legend>
        <div className={styles.grid}>
          {field('gift_message', t.gift.message, { maxLength: 1000, wide: true })}
          {field('account_holder', t.gift.accountHolder, { maxLength: 120 })}
          {field('iban', t.gift.iban, { maxLength: 42 })}
          {field('bic', t.gift.bic, { maxLength: 11 })}
          {field('bank_name', t.gift.bankName, { maxLength: 120 })}
          {field('payment_reason', t.gift.paymentReason, { maxLength: 140, wide: true })}
        </div>
      </fieldset>

      <div className={styles.saveBar}>
        <button type="submit" className={formStyles.submit} disabled={!dirty || status.state === 'saving'}>
          {status.state === 'saving' ? t.saving : t.save}
        </button>
        <span role="status" className={styles.saved}>
          {status.state === 'saved' && !dirty && t.saved}
        </span>
        {status.state === 'error' && (
          <p role="alert" className={formStyles.submitError}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
