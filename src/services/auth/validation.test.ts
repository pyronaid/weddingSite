import { validateEmail, validateLogin, validateNewPassword, validateSignUp } from './validation';

describe('auth validation', () => {
  it('validates e-mails', () => {
    expect(validateEmail('')).toBeDefined();
    expect(validateEmail('nope')).toBeDefined();
    expect(validateEmail(' anna@example.com ')).toBeUndefined();
  });

  it('enforces password length and confirmation', () => {
    expect(validateNewPassword('short', 'short').password).toBeDefined();
    expect(validateNewPassword('x'.repeat(73), 'x'.repeat(73)).password).toBeDefined();
    expect(validateNewPassword('longenough', 'different').passwordConfirm).toBeDefined();
    expect(validateNewPassword('longenough', 'longenough')).toEqual({});
  });

  it('requires credentials to log in', () => {
    expect(validateLogin('', '')).toEqual({ email: expect.any(String), password: expect.any(String) });
  });

  it('validates the whole sign-up form', () => {
    expect(validateSignUp({ name: ' ', email: 'a@b.co', password: 'longenough', passwordConfirm: 'longenough' })).toEqual({
      name: expect.any(String),
    });
  });
});
