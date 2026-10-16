export const PASSWORD_MIN_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Please enter your e-mail.';
  if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid e-mail.';
  return undefined;
}

export function validateNewPassword(password: string, passwordConfirm: string) {
  const errors: FieldErrors<'password' | 'passwordConfirm'> = {};
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (password.length > 72) {
    // bcrypt only uses the first 72 bytes.
    errors.password = 'Password must be at most 72 characters.';
  }
  if (passwordConfirm !== password) errors.passwordConfirm = 'Passwords do not match.';
  return errors;
}

export function validateLogin(email: string, password: string) {
  const errors: FieldErrors<'email' | 'password'> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Please enter your password.';
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
  if (!input.name.trim()) errors.name = 'Please tell us your name.';
  else if (input.name.trim().length > 100) errors.name = 'Name is too long.';
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  // Only presence here: whether it is the right code is up to the server.
  if (!input.secretCode.trim()) errors.secretCode = 'Please enter the secret code.';
  return errors;
}
