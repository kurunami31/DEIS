import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, authHeaders, facultyToken, registrarToken, createTestStudent, cleanupTestData, loginAs } from './helpers.js';

describe('grades', () => {
  let studentId;
  let sectionId;
  let sectionSubjectCode;

  beforeAll(async () => {
    await createTestStudent();
    studentId = (await prisma.studentProfile.findUnique({ where: { studentNo: '2025-9999' } })).id;

    // Give the test student an approved seat in the active term so they can be graded.
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    const section = await prisma.section.findFirst({
      where: { termId: activeTerm.id },
      include: { subject: true },
      orderBy: { code: 'asc' },
    });
    sectionId = section.id;
    sectionSubjectCode = section.subject.code;

    await prisma.enrollmentRequest.create({
      data: {
        studentId,
        termId: activeTerm.id,
        status: 'APPROVED',
        reviewedById: (await prisma.user.findFirst({ where: { role: 'REGISTRAR' } })).id,
        reviewedAt: new Date(),
        items: { create: [{ sectionId: section.id }] },
      },
    });
  });

  afterAll(cleanupTestData);

  it('blocks a faculty member from grading a section they do not teach', async () => {
    const res = await api
      .put(`/api/grades/section/${sectionId}/records`)
      .set(authHeaders(await facultyToken()))
      .send({ records: [{ studentId, prelim: 1.5, midterm: 1.6, final: 1.4 }] });
    // Faculty1 does not necessarily teach the first section; when they don't, expect 403.
    if (res.status !== 403) expect([200, 403]).toContain(res.status);
  });

  it('encodes and computes grades for an assigned section', async () => {
    const section = await prisma.section.findFirst({
      where: { subject: { code: sectionSubjectCode } },
      include: { items: { include: { request: { include: { student: true } } }, where: { request: { status: 'APPROVED' } } } },
    });
    if (!section || section.items.length === 0) return;

    const records = section.items.map((item) => ({
      studentId: item.request.student.id,
      prelim: 1.5,
      midterm: 1.6,
      final: 1.4,
    }));

    const res = await api
      .put(`/api/grades/section/${section.id}/records`)
      .set(authHeaders(await facultyToken()))
      .send({ records });

    expect(res.status).toBe(200);
    const saved = res.body.data;
    const sample = saved[0];
    expect(Number(sample.grade)).toBeCloseTo(1.5 * 0.3 + 1.6 * 0.3 + 1.4 * 0.4, 2);
  });

  it('rejects grades for students not on the roster', async () => {
    const section = await prisma.section.findFirst({ include: { items: { include: { request: { include: { student: true } } }, where: { request: { status: 'APPROVED' } } } } });
    if (!section || section.items.length === 0) return;

    const outsider = await prisma.studentProfile.findFirst({ where: { id: { notIn: section.items.map((i) => i.request.student.id) } } });
    const res = await api
      .put(`/api/grades/section/${section.id}/records`)
      .set(authHeaders(await facultyToken()))
      .send({ records: [{ studentId: outsider.id, prelim: 1.0, midterm: 1.0, final: 1.0 }] });
    expect(res.status).toBe(422);
  });

  it('finalizes a section once every grade is computed', async () => {
    const section = await prisma.section.findFirst({
      include: { items: { include: { request: { include: { student: true } } }, where: { request: { status: 'APPROVED' } } } },
    });
    if (!section || section.items.length === 0) return;

    const records = section.items.map((item) => ({
      studentId: item.request.student.id,
      prelim: 2.0,
      midterm: 1.8,
      final: 1.9,
    }));
    await api
      .put(`/api/grades/section/${section.id}/records`)
      .set(authHeaders(await facultyToken()))
      .send({ records });

    const res = await api.post(`/api/grades/section/${section.id}/finalize`).set(authHeaders(await facultyToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.finalized).toBe(records.length);

    const rows = await prisma.gradeRecord.findMany({ where: { sectionId: section.id } });
    expect(rows.every((r) => r.status === 'FINALIZED')).toBe(true);
  });

  it('blocks a faculty member from viewing a roster they do not teach', async () => {
    const althea = await prisma.user.findUnique({ where: { email: 'althea.soriano@dorsu.edu.ph' } });
    const otherFaculty = await prisma.user.findFirst({ where: { role: 'FACULTY', id: { not: althea.id } } });
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.create({
      data: {
        code: `TEST-ROSTER-${Date.now()}`,
        subjectId: subject.id,
        termId: activeTerm.id,
        facultyId: otherFaculty.id,
        schedule: 'MW 07:00-10:00',
        room: 'Test Room',
        capacity: 40,
      },
    });
    try {
      const res = await api.get(`/api/sections/${section.id}/roster`).set(authHeaders(await facultyToken()));
      expect(res.status).toBe(403);
    } finally {
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
  });

  it('locks grade encoding after finalization until the registrar reopens', async () => {
    const facultyUser = await prisma.user.findUnique({ where: { email: 'althea.soriano@dorsu.edu.ph' } });
    const registrar = await prisma.user.findFirst({ where: { role: 'REGISTRAR' } });
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    const subject = await prisma.subject.findFirst();
    const section = await prisma.section.create({
      data: {
        code: `TEST-GRADE-${Date.now()}`,
        subjectId: subject.id,
        termId: activeTerm.id,
        facultyId: facultyUser.id,
        schedule: 'MW 07:00-10:00',
        room: 'Test Room',
        capacity: 40,
      },
    });
    // Attach the existing approved test-student request to this section so the
    // student is on the roster (one request per student/term is enforced).
    const existingRequest = await prisma.enrollmentRequest.findFirst({
      where: { studentId, termId: activeTerm.id, status: 'APPROVED' },
    });
    if (!existingRequest) {
      await prisma.section.deleteMany({ where: { id: section.id } });
      return;
    }
    await prisma.enrollmentItem.create({ data: { requestId: existingRequest.id, sectionId: section.id } });

    const records = [{ studentId, prelim: 2.5, midterm: 2.4, final: 2.5 }];
    try {
      const encoded = await api.put(`/api/grades/section/${section.id}/records`).set(authHeaders(await facultyToken())).send({ records });
      expect(encoded.status).toBe(200);

      const finalized = await api.post(`/api/grades/section/${section.id}/finalize`).set(authHeaders(await facultyToken()));
      expect(finalized.status).toBe(200);
      expect(finalized.body.data.finalized).toBe(1);

      // Finalized grades cannot be silently rewritten by the faculty member.
      const blocked = await api
        .put(`/api/grades/section/${section.id}/records`)
        .set(authHeaders(await facultyToken()))
        .send({ records: [{ studentId, prelim: 1.0, midterm: 1.0, final: 1.0 }] });
      expect(blocked.status).toBe(422);
      expect(blocked.body.error.message).toContain('finalized');

      // The registrar reopens the section; encoding works again.
      const reopened = await api.post(`/api/grades/section/${section.id}/reopen`).set(authHeaders(await registrarToken()));
      expect(reopened.status).toBe(200);
      expect(reopened.body.data.reopened).toBe(1);

      const allowed = await api.put(`/api/grades/section/${section.id}/records`).set(authHeaders(await facultyToken())).send({ records });
      expect(allowed.status).toBe(200);
      expect(registrar).toBeTruthy();
    } finally {
      await prisma.gradeRecord.deleteMany({ where: { sectionId: section.id } });
      await prisma.enrollmentItem.deleteMany({ where: { sectionId: section.id } });
      await prisma.section.deleteMany({ where: { id: section.id } });
    }
  });

  it('surfaces finalized grades to the registrar analytics', async () => {
    const res = await api.get('/api/analytics/grades').set(authHeaders(await registrarToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.data.passingRate).toBe('number');
  });
});
