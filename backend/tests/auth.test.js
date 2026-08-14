import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, loginAs, loginAsTestStudent, registrarToken, createUnactivatedStudent, activateTestStudent, cleanupTestData, authHeaders, TEST_STUDENT_NO, TEST_STUDENT_PASSWORD } from './helpers.js';
import { demoPassword } from '../src/lib/passwords.js';
import { CURRENT_DPA_VERSION } from '../src/lib/dpa.js';

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

  it('rejects an incorrect activation code', async () => {
    const res = await api.post('/api/auth/activate').send({ studentNo: TEST_STUDENT_NO, activationCode: '000000', password: 'DorsuStrong@123', dpaVersion: 1 });
    expect(res.status).toBe(422);
  });

  it('activates the student and issues a token', async () => {
    const res = await api.post('/api/auth/activate').send({ studentNo: TEST_STUDENT_NO, activationCode: '987654', password: TEST_STUDENT_PASSWORD, dpaVersion: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
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
});