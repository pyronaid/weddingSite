import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  LIMITS,
  normalizeRsvp,
  validateRsvp,
  RsvpSubmissionError,
  type RsvpErrors,
  type RsvpRepository,
  type RsvpSubmission,
} from '../../services/rsvp';
import styles from './RsvpForm.module.css';

interface RsvpFormProps {
  repository: RsvpRepository;
  maxGuests: number;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const INITIAL_VALUES: RsvpSubmission = {
  fullName: '',
  email: '',
  attending: 'yes',
  guests: 1,
  dietaryNotes: '',
  message: '',
};

export function RsvpForm({ repository, maxGuests }: RsvpFormProps) {
  const [values, setValues] = useState<RsvpSubmission>(INITIAL_VALUES);
  const [errors, setErrors] = useState<RsvpErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [submitError, setSubmitError] = useState('');
  // Honeypot: invisible to humans, bots tend to fill every input.
  const [website, setWebsite] = useState('');
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: name === 'guests' ? Number(value) : value }));
    // Clear the field error as soon as the user edits it.
    if (errors[name as keyof RsvpSubmission]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const normalized = normalizeRsvp(values);
    const validationErrors = validateRsvp(normalized, maxGuests);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalid = Object.keys(validationErrors)[0];
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    if (website) {
      // Pretend success for bots, store nothing.
      setStatus('success');
      return;
    }

    setStatus('submitting');
    setSubmitError('');
    try {
      await repository.submit(normalized);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof RsvpSubmissionError ? error.message : 'Something went wrong. Please try again.',
      );
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.success} role="status">
        <p className={styles.successTitle}>Thank you, {values.fullName.trim().split(' ')[0]}!</p>
        <p>
          {values.attending === 'yes'
            ? 'We cannot wait to celebrate with you.'
            : 'We will miss you, thank you for letting us know.'}
        </p>
      </div>
    );
  }

  const isAttending = values.attending === 'yes';
  const describedBy = (name: keyof RsvpSubmission) => (errors[name] ? fieldId(`${name}-error`) : undefined);
  const errorText = (name: keyof RsvpSubmission) =>
    errors[name] ? (
      <span id={fieldId(`${name}-error`)} className={styles.error}>
        {errors[name]}
      </span>
    ) : null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor={fieldId('fullName')}>Full name *</label>
        <input
          id={fieldId('fullName')}
          name="fullName"
          autoComplete="name"
          maxLength={LIMITS.fullName}
          value={values.fullName}
          onChange={handleChange}
          aria-invalid={!!errors.fullName}
          aria-describedby={describedBy('fullName')}
          required
        />
        {errorText('fullName')}
      </div>

      <div className={styles.field}>
        <label htmlFor={fieldId('email')}>E-mail *</label>
        <input
          id={fieldId('email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          value={values.email}
          onChange={handleChange}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy('email')}
          required
        />
        {errorText('email')}
      </div>

      <fieldset className={styles.field}>
        <legend>Will you attend? *</legend>
        <div className={styles.choices}>
          <label className={styles.choice}>
            <input type="radio" name="attending" value="yes" checked={isAttending} onChange={handleChange} />
            <span>Joyfully accept</span>
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name="attending"
              value="no"
              checked={values.attending === 'no'}
              onChange={handleChange}
            />
            <span>Regretfully decline</span>
          </label>
        </div>
        {errorText('attending')}
      </fieldset>

      {isAttending && (
        <>
          <div className={styles.field}>
            <label htmlFor={fieldId('guests')}>Number of guests (you included) *</label>
            <select
              id={fieldId('guests')}
              name="guests"
              value={values.guests}
              onChange={handleChange}
              aria-invalid={!!errors.guests}
              aria-describedby={describedBy('guests')}
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {errorText('guests')}
          </div>

          <div className={styles.field}>
            <label htmlFor={fieldId('dietaryNotes')}>Allergies or dietary requirements</label>
            <input
              id={fieldId('dietaryNotes')}
              name="dietaryNotes"
              maxLength={LIMITS.dietaryNotes}
              value={values.dietaryNotes}
              onChange={handleChange}
              aria-invalid={!!errors.dietaryNotes}
              aria-describedby={describedBy('dietaryNotes')}
            />
            {errorText('dietaryNotes')}
          </div>
        </>
      )}

      <div className={styles.field}>
        <label htmlFor={fieldId('message')}>A message for us</label>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={3}
          maxLength={LIMITS.message}
          value={values.message}
          onChange={handleChange}
          aria-invalid={!!errors.message}
          aria-describedby={describedBy('message')}
        />
        {errorText('message')}
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={fieldId('website')}>Website</label>
        <input
          id={fieldId('website')}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === 'error' && (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send confirmation'}
      </button>
    </form>
  );
}
