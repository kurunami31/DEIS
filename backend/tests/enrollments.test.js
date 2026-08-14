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

    // Year-2 BSIT subjects require BSIT-Y1-02 as a prerequisite; give the test
    // student a finalized passing grade so the evaluator rules accept them.
    const y1sec = await prisma.section.findFirst({
      where: { termId: activeTermId, subject: { code: 'BSIT-Y1-02' } },
    });
    if (y1sec) {
      await prisma.gradeRecord.create({
        data: { sectionId: y1sec.id, studentId, prelim: 2.0, midterm: 2.0, final: 2.0, grade: 2.0, status: 'FINALIZED' },
      });
    }
  });

  afterAll(cleanupTestData);

  // The test student is year 2 of BSIT with a passing grade in BSIT-Y1-02.
  // Pick a section the evaluator rules will accept: same year level, all
  // prerequisites passed, free seats.
  async function eligibleSection() {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    const passed = await prisma.gradeRecord.findMany({
      where: { studentId, grade: { lte: 3.0 } },
      select: { section: { select: { subjectId: true } } },
    });
    const passedIds = new Set(passed.map((p) => p.section.subjectId));
    const candidates = await prisma.section.findMany({
      where: { termId: activeTermId, subject: { programId: student.programId, yearLevel: student.yearLevel } },
      include: { subject: { include: { requires: { select: { prereqId: true } } } } },
    });
    const section = candidates.find(
      (s) => s.subject.requires.every((r) => passedIds.has(r.prereqId)),
    );
    if (!section) throw new Error('No eligible seed section found for the test student');
    return section;
  }

  it('returns the active term, sections, and evaluation info for a student', async () => {
    const res = await api.get('/api/enrollments/available-sections').set(authHeaders((await loginAsTestStudent()).body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.term).toBeTruthy();
    expect(Array.isArray(res.body.data.sections)).toBe(true);
    expect(res.body.data.evaluation).toHaveProperty('gwa');
    expect(res.body.data.evaluation).toHaveProperty('allowedUnits');
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

  it('blocks subjects outside the student year level', async () => {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    const wrongYear = await prisma.section.findFirst({
      where: {
        termId: activeTermId,
        subject: { programId: student.programId, yearLevel: { not: student.yearLevel }, requires: { none: {} } },
      },
    });
    if (!wrongYear) return;
    const res = await api
      .post('/api/enrollments/submit')
      .set(authHeaders((await loginAsTestStudent()).body.data.token))
      .send({ sections: [wrongYear.id] });
    expect(res.status).toBe(422);
    expect(res.body.error.details.some((d) => d.code === 'YEAR_LEVEL_MISMATCH')).toBe(true);
  });

  it('prevents a second active request for the same term', async () => {
    const section = await eligibleSection();
    const token = (await loginAsTestStudent()).body.data.token;

    const first = await api.post('/api/enrollments/submit').set(authHeaders(token)).send({ sections: [section.id] });
    expect(first.status).toBe(201);

    const second = await api.post('/api/enrollments/submit').set(authHeaders(token)).send({ sections: [section.id] });
    expect(second.status).toBe(409);

    await prisma.enrollmentItem.deleteMany({ where: { request: { studentId } } });
    await prisma.enrollmentRequest.deleteMany({ where: { studentId } });
  });

  it('records the payment stub and lets the registrar approve a paid request', async () => {
    const section = await eligibleSection();
    const token = (await loginAsTestStudent()).body.data.token;
    const pending = await prisma.enrollmentRequest.findFirst({
      where: { status: 'PENDING', items: { some: {} } },
    });
    if (!pending) {
      const created = await api.post('/api/enrollments/submit').set(authHeaders(token)).send({ sections: [section.id] });
      expect(created.status).toBe(201);
      const fresh = await prisma.enrollmentRequest.findFirst({
        where: { status: 'PENDING', items: { some: {} } },
        orderBy: { submittedAt: 'desc' },
      });
      return expect(fresh).toBeTruthy();
    }

    // Unpaid requests cannot be approved.
    const blocked = await api
      .post(`/api/enrollments/${pending.id}/review`)
      .set(authHeaders(await registrarToken()))
      .send({ action: 'approve', reviewNotes: 'All documents verified' });
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe('PAYMENT_REQUIRED');

    // Pay, then approve.
    const paid = await api
      .post(`/api/enrollments/${pending.id}/payment`)
      .set(authHeaders(token))
      .send({ amount: 2500, reference: 'GPAY-2026-0001' });
    expect(paid.status).toBe(200);
    expect(paid.body.data.paymentPaidAt).toBeTruthy();

    const res = await api
      .post(`/api/enrollments/${pending.id}/review`)
      .set(authHeaders(await registrarToken()))
      .send({ action: 'approve', reviewNotes: 'All documents verified' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.reviewNotes).toBe('All documents verified');

    await prisma.enrollmentItem.deleteMany({ where: { request: { studentId } } });
    await prisma.enrollmentRequest.deleteMany({ where: { studentId } });
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
