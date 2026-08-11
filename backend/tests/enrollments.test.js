import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, authHeaders, registrarToken, createTestStudent, cleanupTestData, loginAsTestStudent } from './helpers.js';

describe('enrollments', () => {
  let studentId;
  let activeTermId;

  beforeAll(async () => {
    await createTestStudent();
    studentId = (await prisma.studentProfile.findUnique({ where: { studentNo: '2025-9999' } })).id;
    activeTermId = (await prisma.term.findFirst({ where: { isActive: true } })).id;
  });

  afterAll(cleanupTestData);

  it('returns the active term and available sections for a student', async () => {
    const res = await api.get('/api/enrollments/available-sections').set(authHeaders((await loginAsTestStudent()).body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.term).toBeTruthy();
    expect(Array.isArray(res.body.data.sections)).toBe(true);
  });

  it('rejects a submission with no sections selected', async () => {
    const res = await api
      .post('/api/enrollments/submit')
      .set(authHeaders((await loginAsTestStudent()).body.data.token))
      .send({ sections: [] });
    expect(res.status).toBe(400);
  });

  it('rejects sections from a different term', async () => {
    const term = await prisma.term.findFirst({ where: { isActive: false } });
    const foreignSection = await prisma.section.findFirst({ where: { termId: term.id } });
    const res = await api
      .post('/api/enrollments/submit')
      .set(authHeaders((await loginAsTestStudent()).body.data.token))
      .send({ sections: [foreignSection.id] });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('do not exist in this term');
  });

  it('prevents a second active request for the same term', async () => {
    const section = await prisma.section.findFirst({ where: { termId: activeTermId } });
    const token = (await loginAsTestStudent()).body.data.token;

    const first = await api.post('/api/enrollments/submit').set(authHeaders(token)).send({ sections: [section.id] });
    expect(first.status).toBe(201);

    const second = await api.post('/api/enrollments/submit').set(authHeaders(token)).send({ sections: [section.id] });
    expect(second.status).toBe(409);

    await prisma.enrollmentItem.deleteMany({ where: { request: { studentId } } });
    await prisma.enrollmentRequest.deleteMany({ where: { studentId } });
  });

  it('lets the registrar approve a pending request', async () => {
    const pending = await prisma.enrollmentRequest.findFirst({
      where: { status: 'PENDING', items: { some: {} } },
    });
    if (!pending) return;

    const res = await api
      .post(`/api/enrollments/${pending.id}/review`)
      .set(authHeaders(await registrarToken()))
      .send({ action: 'approve', reviewNotes: 'All documents verified' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.reviewNotes).toBe('All documents verified');
  });

  it('rejects double review of the same request', async () => {
    const approved = await prisma.enrollmentRequest.findFirst({
      where: { status: 'APPROVED' },
    });
    if (!approved) return;
    const res = await api
      .post(`/api/enrollments/${approved.id}/review`)
      .set(authHeaders(await registrarToken()))
      .send({ action: 'reject' });
    expect(res.status).toBe(409);
  });

  it('prevents a student from reviewing requests', async () => {
    const res = await api
      .post(`/api/enrollments/some-id/review`)
      .set(authHeaders((await loginAsTestStudent()).body.data.token))
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });
});
