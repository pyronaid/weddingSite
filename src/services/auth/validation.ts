import { messagesOf } from '../../i18n';
import { authServiceMessages } from './messages';

export const PASSWORD_MIN_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Messages in the site language, read when validating. */
const texts = () => messagesOf(authServiceMessages);

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return texts().emailMissing;
  if (!EMAIL_RE.test(email.trim())) return texts().emailInvalid;
  return undefined;
}

export function validateNewPassword(password: string, passwordConfirm: string) {
  const errors: FieldErrors<'password' | 'passwordConfirm'> = {};
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = texts().passwordTooShort(PASSWORD_MIN_LENGTH);
  } else if (password.length > 72) {
    // bcrypt only uses the first 72 bytes.
    errors.password = texts().passwordTooLong;
  }
  if (passwordConfirm !== password) errors.passwordConfirm = texts().passwordsDiffer;
  return errors;
}

export function validateLogin(email: string, password: string) {
  const errors: FieldErrors<'email' | 'password'> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = texts().passwordMissing;
  return errors;
}

export function validateSignUp(input: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  secretCode: string;
}) {
  const errors: FieldErrors<'name' | 'email' | 'password' | 'passwordConfirm' | 'secretCode'> = {
    ...validateNewPassword(input.password, input.passwordConfirm),
  };
  if (!input.name.trim()) errors.name = texts().nameMissing;
  else if (input.name.trim().length > 100) errors.name = texts().nameTooLong;
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  // Only presence here: whether it is the right code is up to the server.
  if (!input.secretCode.trim()) errors.secretCode = texts().secretCodeMissing;
  return errors;
}
