import { toAuthError } from './errors';
import { AuthError } from './types';

const pbError = (status: number, data: Record<string, { code?: string; message?: string }> = {}) => ({
  status,
  response: { message: 'x', data },
});

describe('toAuthError', () => {
  it('maps login failures', () => {
    expect(toAuthError(pbError(400), 'login').code).toBe('invalid_credentials');
    expect(toAuthError(pbError(403), 'login').code).toBe('email_not_verified');
  });

  it('maps transport problems', () => {
    expect(toAuthError(pbError(0)).code).toBe('network');
    expect(toAuthError(pbError(429), 'login').code).toBe('rate_limited');
  });

  it('exposes server field errors and rewrites the duplicate e-mail message', () => {
    const error = toAuthError(
      pbError(400, { email: { code: 'validation_not_unique', message: 'Value must be unique.' } }),
      'signup',
    );
    expect(error.code).toBe('validation');
    expect(error.fieldErrors.email).toMatch(/already exists/);
  });

  it('distinguishes an invalid token from a password validation error', () => {
    expect(toAuthError(pbError(400, { token: { message: 'Invalid token.' } }), 'token').code).toBe('invalid_token');
    expect(toAuthError(pbError(400), 'token').code).toBe('invalid_token');
    const pw = toAuthError(pbError(400, { password: { message: 'Too short.' } }), 'token');
    expect(pw.code).toBe('validation');
    expect(pw.fieldErrors.password).toBe('Too short.');
  });

  it('wraps unknown errors and passes AuthError through', () => {
    expect(toAuthError(new Error('boom')).code).toBe('unknown');
    const original = new AuthError('not_configured', 'nope');
    expect(toAuthError(original)).toBe(original);
  });
});
