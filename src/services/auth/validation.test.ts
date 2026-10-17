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
    const valid = { name: 'Anna', email: 'a@b.co', password: 'longenough', passwordConfirm: 'longenough', secretCode: '#wedding' };
    expect(validateSignUp(valid)).toEqual({});
    expect(validateSignUp({ ...valid, name: ' ' })).toEqual({ name: expect.any(String) });
  });

  it('requires the secret code (its value is checked by the server)', () => {
    const input = { name: 'Anna', email: 'a@b.co', password: 'longenough', passwordConfirm: 'longenough', secretCode: '  ' };
    expect(validateSignUp(input)).toEqual({ secretCode: 'Please enter the secret code.' });
  });
});
