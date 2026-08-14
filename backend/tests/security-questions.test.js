import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeaders } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/passwords.js';

const EMAIL = 'sq-test@dorsu.edu.ph';
const PASSWORD = 'SqTest@1234';
const NEW_PASSWORD = 'FreshPass@5678';
const ANSWERS = [
  { questionId: 'mother_maiden', answer: 'Reyes' },
  { questionId: 'birth_city', answer: 'Mati' },
  { questionId: 'pet_name', answer: 'Brownie' },
];
const WRONG_ANSWERS = ANSWERS.map((a, i) => (i === 0 ? { ...a, answer: 'Wrong' } : a));

let user = null;
let token = null;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      fullName: 'Sq Test',
      role: 'OSA',
      dpaConsentAt: new Date(),
      dpaConsentVersion: 1,
    },
  });
  const login = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
  token = login.body.data.token;
});

afterAll(async () => {
  if (user) await prisma.user.deleteMany({ where: { id: user.id } });
});

describe('security questions recovery', () => {
  it('requires valid question ids and stores hashed answers', async () => {
    const bad = await api
      .put('/api/auth/security-questions')
      .set(authHeaders(token))
      .send({ answers: ANSWERS.map((a) => ({ ...a, questionId: 'not-a-real-id' })) });
    expect(bad.status).toBe(422);

    const ok = await api.put('/api/auth/security-questions').set(authHeaders(token)).send({ answers: ANSWERS });
    expect(ok.status).toBe(200);
    expect(ok.body.data.questions).toHaveLength(3);

    const stored = JSON.parse((await prisma.user.findUnique({ where: { id: user.id } })).passwordQuestions);
    expect(stored).toHaveLength(3);
    expect(stored[0]).not.toHaveProperty('answer');
    expect(stored[0].hash).not.toContain('Reyes');
  });

  it('refuses to begin recovery for unknown accounts', async () => {
    const res = await api.post('/api/auth/forgot-password').send({ identifier: 'nobody@dorsu.edu.ph' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong answers and accepts the correct ones', async () => {
    const begun = await api.post('/api/auth/forgot-password').send({ identifier: EMAIL });
    expect(begun.status).toBe(200);
    expect(begun.body.data.questions).toHaveLength(3);

    const wrong = await api
      .post('/api/auth/reset-password')
      .send({ resetToken: begun.body.data.resetToken, answers: WRONG_ANSWERS, newPassword: NEW_PASSWORD });
    expect(wrong.status).toBe(401);

    const right = await api
      .post('/api/auth/reset-password')
      .send({ resetToken: begun.body.data.resetToken, answers: ANSWERS, newPassword: NEW_PASSWORD });
    expect(right.status).toBe(200);

    const oldPassword = await api.post('/api/auth/login').send({ identifier: EMAIL, password: PASSWORD });
    expect(oldPassword.status).toBe(401);

    const newPassword = await api.post('/api/auth/login').send({ identifier: EMAIL, password: NEW_PASSWORD });
    expect(newPassword.status).toBe(200);
  });

  it('cannot reuse the same reset token', async () => {
    const begun = await api.post('/api/auth/forgot-password').send({ identifier: EMAIL });
    const first = await api
      .post('/api/auth/reset-password')
      .send({ resetToken: begun.body.data.resetToken, answers: ANSWERS, newPassword: 'Another@Pass99' });
    expect(first.status).toBe(200);

    const second = await api
      .post('/api/auth/reset-password')
      .send({ resetToken: begun.body.data.resetToken, answers: ANSWERS, newPassword: 'YetAnother@Pass77' });
    expect(second.status).toBe(401);
  });
});