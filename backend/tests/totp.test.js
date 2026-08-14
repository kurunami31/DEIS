import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeaders } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/passwords.js';
import { currentTotp } from '../src/lib/totp.js';

const EMAIL = 'totp-test@dorsu.edu.ph';
const PASSWORD = 'TotpTest@1234';

let user = null;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      fullName: 'Totp Test',
      role: 'REGISTRAR',
      dpaConsentAt: new Date(),
      dpaConsentVersion: 1,
    },
  });
});

afterAll(async () => {
  if (user) await prisma.user.deleteMany({ where: { id: user.id } });
});

describe('TOTP two-factor authentication', () => {
  let loginToken;
  let rawRecoveryCodes = [];

  beforeAll(async () => {
    loginToken = (await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD })).body.data.token;
  });

  it('returns a challenge instead of a token once TOTP is enabled', async () => {
    const enrolled = await api.post('/api/auth/totp/enroll').set(authHeaders(loginToken));
    expect(enrolled.status).toBe(200);
    expect(enrolled.body.data.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrolled.body.data.otpauthUrl).toContain('otpauth://totp/');

    const rejected = await api
      .post('/api/auth/totp/confirm')
      .set(authHeaders(loginToken))
      .send({ code: '000000' });
    expect(rejected.status).toBe(422);

    const confirmed = await api
      .post('/api/auth/totp/confirm')
      .set(authHeaders(loginToken))
      .send({ code: currentTotp(enrolled.body.data.secret) });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.recoveryCodes).toHaveLength(8);
    rawRecoveryCodes = confirmed.body.data.recoveryCodes;

    const login = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
    expect(login.status).toBe(202);
    expect(login.body.data.totpRequired).toBe(true);
    expect(login.body.data.token).toBeUndefined();
    expect(login.body.data.challengeToken).toBeTruthy();
  });

  it('completes login with a valid code and rejects an invalid one', async () => {
    const challenge = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
    const challengeToken = challenge.body.data.challengeToken;
    const secret = (await prisma.user.findUnique({ where: { id: user.id } })).totpSecret;

    const rejected = await api.post('/api/auth/login/totp').send({ challengeToken, code: '123456' });
    expect(rejected.status).toBe(401);

    const accepted = await api.post('/api/auth/login/totp').send({ challengeToken, code: currentTotp(secret) });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.token).toBeTruthy();
  });

it('accepts a recovery code exactly once', async () => {
    const challenge = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
    const challengeToken = challenge.body.data.challengeToken;
    const probe = rawRecoveryCodes[0];

    const accepted = await api.post('/api/auth/login/totp').send({ challengeToken, code: probe });
    expect(accepted.status).toBe(200);

    const secondChallenge = (await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD })).body.data.challengeToken;
    const reused = await api.post('/api/auth/login/totp').send({ challengeToken: secondChallenge, code: probe });
    expect(reused.status).toBe(401);

    const stored = JSON.parse((await prisma.user.findUnique({ where: { id: user.id } })).totpRecoveryCodes);
    expect(stored).toHaveLength(7);
  });

  it('disables TOTP with a valid code', async () => {
    const secret = (await prisma.user.findUnique({ where: { id: user.id } })).totpSecret;
    const disabled = await api
      .post('/api/auth/totp/disable')
      .set(authHeaders(loginToken))
      .send({ code: currentTotp(secret) });
    expect(disabled.status).toBe(200);

    const login = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTruthy();
  });
});

