import { describe, expect, it } from 'vitest';
import { exchangeCodeForIdToken, verifyGoogleIdToken } from '../src/lib/google.js';

const TEST_CLIENT_ID = 'google-test-client-id.apps.googleusercontent.com';

function fakeFetch(status, body, ok = status >= 200 && status < 300) {
  return async () => ({ ok, status, json: async () => body });
}

describe('google id token verification', () => {
  it('accepts the string-form email_verified claim returned by tokeninfo', async () => {
    const payload = await verifyGoogleIdToken(
      'fake-token',
      fakeFetch(200, { aud: TEST_CLIENT_ID, email: 'user@example.com', email_verified: 'true' }),
    );
    expect(payload.email).toBe('user@example.com');
  });

  it('accepts a boolean email_verified claim too', async () => {
    const payload = await verifyGoogleIdToken(
      'fake-token',
      fakeFetch(200, { aud: TEST_CLIENT_ID, email: 'user@example.com', email_verified: true }),
    );
    expect(payload.email).toBe('user@example.com');
  });

  it('rejects a token issued for a different client', async () => {
    await expect(
      verifyGoogleIdToken('fake-token', fakeFetch(200, { aud: 'someone-elses-client.apps.googleusercontent.com', email: 'x@example.com', email_verified: true })),
    ).rejects.toThrow(/validation failed/i);
  });

  it('rejects unverified emails', async () => {
    await expect(
      verifyGoogleIdToken('fake-token', fakeFetch(200, { aud: TEST_CLIENT_ID, email: 'x@example.com', email_verified: 'false' })),
    ).rejects.toThrow(/not verified/i);
  });

  it('propagates exchange failures with a descriptive code', async () => {
    await expect(
      exchangeCodeForIdToken({ code: 'bad', redirectUri: 'http://localhost:4000/api/auth/google/callback' }, fakeFetch(400, { error: 'invalid_grant' })),
    ).rejects.toThrow(/rejected the authorization code/i);
  });
});