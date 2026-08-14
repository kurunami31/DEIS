import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { api, loginAs, loginAsTestStudent, registrarToken, createUnactivatedStudent, activateTestStudent, cleanupTestData, authHeaders, TEST_STUDENT_NO, TEST_STUDENT_PASSWORD } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { demoPassword } from '../src/lib/passwords.js';
import { CURRENT_DPA_VERSION } from '../src/lib/dpa.js';
import { config } from '../src/config.js';

vi.mock('../src/lib/google.js', () => ({
  buildAuthorizationUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?test=1'),
  exchangeCodeForIdToken: vi.fn(async () => 'fake-id-token'),
  verifyGoogleIdToken: vi.fn(),
}));

const OAUTH_STATE = 'test-oauth-state-123';

describe('auth', () => {
  beforeAll(createUnactivatedStudent);
  afterAll(cleanupTestData);

  it('rejects invalid credentials', async () => {
    const res = await api.post('/api/auth/login').send({ identifier: 'registrar@dorsu.edu.ph', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs staff in and returns a usable token', async () => {
    const res = await loginAs('registrar@dorsu.edu.ph');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('REGISTRAR');
    expect(res.body.data.token).toBeTruthy();
  });

  it('verifies an unactivated student and returns the activation code', async () => {
    const res = await api.post('/api/auth/verify-student').send({ studentNo: TEST_STUDENT_NO });
    expect(res.status).toBe(200);
    expect(res.body.data.activationCode).toBe('987654');
    expect(res.body.data.alreadyActivated).toBe(false);
  });

  it('never returns the activation code when disclosure is disabled (production)', async () => {
    const original = config.exposeActivationCodes;
    config.exposeActivationCodes = false;
    try {
      const res = await api.post('/api/auth/verify-student').send({ studentNo: TEST_STUDENT_NO });
      expect(res.status).toBe(200);
      expect(res.body.data.activationCode).toBeUndefined();
      expect(res.body.data.studentNo).toBe(TEST_STUDENT_NO);
    } finally {
      config.exposeActivationCodes = original;
    }
  });

  it('rejects an incorrect activation code', async () => {
    const res = await api.post('/api/auth/activate').send({ studentNo: TEST_STUDENT_NO, activationCode: '000000', password: 'DorsuStrong@123', dpaVersion: 1 });
    expect(res.status).toBe(422);
  });

  it('rejects an expired activation code', async () => {
    const program = await prisma.program.findUnique({ where: { code: 'BSIT' } });
    const campus = await prisma.campus.findUnique({ where: { code: 'MATI' } });
    const expired = await prisma.studentProfile.create({
      data: {
        studentNo: '2025-9998',
        firstName: 'Expired',
        lastName: 'Student',
        sex: 'FEMALE',
        yearLevel: 1,
        strand: 'STEM',
        programId: program.id,
        campusId: campus.id,
        activationCode: '555111',
        activationExpiresAt: new Date(Date.now() - 86400000),
      },
    });
    try {
      const res = await api
        .post('/api/auth/activate')
        .send({ studentNo: '2025-9998', activationCode: '555111', password: 'DorsuStrong@123', dpaVersion: 1 });
      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain('expired');
    } finally {
      await prisma.studentProfile.deleteMany({ where: { id: expired.id } });
    }
  });

  it('activates the student, issues a token, and consumes the code', async () => {
    const res = await api.post('/api/auth/activate').send({ studentNo: TEST_STUDENT_NO, activationCode: '987654', password: TEST_STUDENT_PASSWORD, dpaVersion: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();

    // Single-use: the code is nulled on activation and can never be replayed.
    const row = await prisma.studentProfile.findUnique({ where: { studentNo: TEST_STUDENT_NO } });
    expect(row.activationCode).toBeNull();
    expect(row.activationExpiresAt).toBeNull();
  });

  it('blocks activation of an already-activated student', async () => {
    const res = await api.post('/api/auth/activate').send({ studentNo: TEST_STUDENT_NO, activationCode: '987654', password: TEST_STUDENT_PASSWORD, dpaVersion: 1 });
    expect(res.status).toBe(409);
  });

  it('lets the newly activated student login', async () => {
    const res = await loginAsTestStudent();
    expect(res.status).toBe(200);
    expect(res.body.data.user.student.studentNo).toBe(TEST_STUDENT_NO);
  });

  it('exposes consent state on /auth/me', async () => {
    const res = await api.get('/api/auth/me').set(authHeaders((await loginAsTestStudent()).body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.dpaConsentRequired).toBe(false);
    expect(res.body.data.dpaConsentVersion).toBeGreaterThanOrEqual(1);
  });

  it('gates portal routes until consent is recorded', async () => {
    // A fresh login (no consent recorded) must be blocked on portal routes.
    const res = await api.post('/api/auth/login').send({ identifier: 'cashiering@dorsu.edu.ph', password: demoPassword('cashiering@dorsu.edu.ph') });
    const token = res.body.data.token;
    const blocked = await api.get('/api/calendar').set(authHeaders(token));
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('DPA_CONSENT_REQUIRED');
  });

  it('rejects consent with a stale version', async () => {
    const token = (await loginAsTestStudent()).body.data.token;
    const res = await api.post('/api/auth/consent').set(authHeaders(token)).send({ version: CURRENT_DPA_VERSION + 1 });
    expect(res.status).toBe(422);
  });

  it('records consent and unblocks the portal', async () => {
    const res = await api.post('/api/auth/login').send({ identifier: 'registrar@dorsu.edu.ph', password: demoPassword('registrar@dorsu.edu.ph') });
    const token = res.body.data.token;
    const consent = await api.post('/api/auth/consent').set(authHeaders(token)).send({ version: 1 });
    expect(consent.status).toBe(200);
    expect(consent.body.data.dpaConsentVersion).toBe(1);
    const calendar = await api.get('/api/calendar').set(authHeaders(token));
    expect(calendar.status).toBe(200);
  });

  it('allows changing the password', async () => {
    const token = (await loginAsTestStudent()).body.data.token;
    const res = await api
      .post('/api/auth/change-password')
      .set(authHeaders(token))
      .send({ currentPassword: TEST_STUDENT_PASSWORD, newPassword: 'DorsuStrong@456' });
    expect(res.status).toBe(200);

    const relogin = await loginAs(TEST_STUDENT_NO, 'DorsuStrong@456');
    expect(relogin.status).toBe(200);

    // Restore the canonical test password for the suites that follow.
    await api
      .post('/api/auth/change-password')
      .set(authHeaders(relogin.body.data.token))
      .send({ currentPassword: 'DorsuStrong@456', newPassword: TEST_STUDENT_PASSWORD });
  });

  it('revokes the session token on logout', async () => {
    const token = (await loginAs('registrar@dorsu.edu.ph')).body.data.token;
    const me = await api.get('/api/auth/me').set(authHeaders(token));
    expect(me.status).toBe(200);

    const logout = await api.post('/api/auth/logout').set(authHeaders(token));
    expect(logout.status).toBe(200);

    const after = await api.get('/api/auth/me').set(authHeaders(token));
    expect(after.status).toBe(401);
  });
});

describe('auth / google oauth', () => {
  beforeAll(createUnactivatedStudent);
  afterAll(cleanupTestData);

  it('redirects to Google with a state cookie', async () => {
    const res = await api.get('/api/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
    const setCookie = res.headers['set-cookie'].join(';');
    expect(setCookie).toContain('__Host-deis_oauth_state=');
    expect(setCookie).toContain('Max-Age=600');
  });

  it('signs an existing user in from the callback', async () => {
    await activateTestStudent();
    const { verifyGoogleIdToken } = await import('../src/lib/google.js');
    verifyGoogleIdToken.mockResolvedValue({ email: `${TEST_STUDENT_NO.toLowerCase()}@students.dorsu.edu.ph` });
    const res = await api
      .get('/api/auth/google/callback')
      .query({ state: OAUTH_STATE, code: 'test-code' })
      .set('Cookie', `__Host-deis_oauth_state=${OAUTH_STATE}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/oauth/callback');
    expect(res.headers['set-cookie'].join(';')).toContain('deis_session=');
  });

  it('rejects a mismatched state', async () => {
    const res = await api
      .get('/api/auth/google/callback')
      .query({ state: 'wrong-state', code: 'test-code' })
      .set('Cookie', `__Host-deis_oauth_state=${OAUTH_STATE}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('reason=invalid_state');
  });

  it('redirects unknown emails to the login page', async () => {
    const { verifyGoogleIdToken } = await import('../src/lib/google.js');
    verifyGoogleIdToken.mockResolvedValueOnce({ email: 'stranger@example.com' });
    const res = await api
      .get('/api/auth/google/callback')
      .query({ state: OAUTH_STATE, code: 'test-code' })
      .set('Cookie', `__Host-deis_oauth_state=${OAUTH_STATE}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('reason=not_registered');
  });
});