import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { submitSchema, reviewSchema } from './enrollments.schema.js';
import { validateEnrollment } from './enrollments.service.js';

const router = Router();

const sectionInclude = {
  section: {
    include: {
      subject: true,
      faculty: { select: { fullName: true } },
    },
  },
};

function buildRequestInclude() {
  return {
    student: { include: { program: true, campus: true } },
    term: true,
    items: { include: sectionInclude },
  };
}

router.get(
  '/active-term',
  asyncHandler(async (req, res) => {
    const term = await prisma.term.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
    return ok(res, term);
  }),
);

router.get(
  '/available-sections',
  authenticate,
  requireStudent,
  asyncHandler(async (req, res) => {
    // The authenticated user already carries the linked student profile, so the
    // initial lookup can be skipped (one fewer DB round trip per request).
    const student = req.user.student;
    if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const term = await prisma.term.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
    if (!term) return ok(res, { term: null, sections: [] });

    const [sections, passed] = await Promise.all([
      prisma.section.findMany({
        where: { termId: term.id, subject: { programId: student.programId } },
        include: {
          subject: { include: { requires: { include: { prereq: true } } } },
          faculty: { select: { fullName: true } },
        },
        orderBy: [{ subject: { yearLevel: 'asc' } }, { subject: { semester: 'asc' } }, { code: 'asc' }],
      }),
      prisma.gradeRecord.findMany({
        where: { studentId: student.id, grade: { lte: 3.0 } },
        select: { section: { select: { subjectId: true } } },
      }),
    ]);
    const passedSet = new Set(passed.map((p) => p.section.subjectId));

    const enrollmentItems = await prisma.enrollmentItem.findMany({
      where: {
        sectionId: { in: sections.map((s) => s.id) },
        request: { status: { in: ['PENDING', 'APPROVED'] } },
      },
      select: { sectionId: true },
    });
    const filledSeats = enrollmentItems.reduce((acc, item) => {
      acc[item.sectionId] = (acc[item.sectionId] ?? 0) + 1;
      return acc;
    }, {});

    const serialized = sections.map((section) => ({
      ...section,
      prereqMet: section.subject.requires.every((r) => passedSet.has(r.prereqId)),
      seatsTaken: filledSeats[section.id] ?? 0,
      seatsLeft: Math.max(0, section.capacity - (filledSeats[section.id] ?? 0)),
    }));

    return ok(res, { term, sections: serialized });
  }),
);

router.get(
  '/my',
  authenticate,
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const requests = await prisma.enrollmentRequest.findMany({
      where: { studentId: student.id },
      include: buildRequestInclude(),
      orderBy: { submittedAt: 'desc' },
    });
    return ok(res, requests);
  }),
);

router.post(
  '/submit',
  authenticate,
  requireStudent,
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const term = await prisma.term.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
    if (!term) return res.status(422).json({ error: { code: 'NO_ACTIVE_TERM', message: 'No active term is configured yet.' } });

    // Enrollment gate: the Student Profile Form must be completed first.
    if (!student.spfCompletedAt) {
      return res.status(422).json({
        error: {
          code: 'SPF_REQUIRED',
          message: 'Complete your Student Profile Form before enrolling.',
          details: [{ field: 'spf', message: 'Student Profile Form (FM-DOrSU-ODI-05) must be submitted first.' }],
        },
      });
    }

    const issues = await validateEnrollment(student.id, term.id, req.body.sections);
    if (issues.length > 0) {
      return res.status(422).json({ error: { code: 'ENROLLMENT_RULES', message: 'Enrollment rules not satisfied', details: issues } });
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.enrollmentRequest.create({
        data: {
          studentId: student.id,
          termId: term.id,
          status: 'PENDING',
          studentNote: req.body.studentNote,
          items: { create: req.body.sections.map((sectionId) => ({ sectionId })) },
        },
        include: buildRequestInclude(),
      });
      return created;
    });

    await audit({ actorId: req.user.id, action: 'ENROLLMENT_SUBMITTED', entityType: 'enrollment', entityId: request.id });
    return created(res, request);
  }),
);

router.get(
  '/',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN', 'ADMISSION'),
  asyncHandler(async (req, res) => {
    const { status, termId } = req.query;
    const requests = await prisma.enrollmentRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(termId ? { termId } : {}),
      },
      include: buildRequestInclude(),
      orderBy: { submittedAt: 'desc' },
      take: 300,
    });
    return ok(res, requests);
  }),
);

router.post(
  '/:id/withdraw',
  authenticate,
  requireStudent,
  validate(z.object({ id: z.string().uuid('Invalid request id') }), 'params'),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const request = await prisma.enrollmentRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return ok(res, null);
    if (request.studentId !== student.id) return ok(res, null);

    if (request.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'ALREADY_REVIEWED', message: 'Only pending requests can be withdrawn.' } });
    }

    const updated = await prisma.enrollmentRequest.update({
      where: { id: request.id },
      data: { status: 'WITHDRAWN' },
      include: buildRequestInclude(),
    });

    await audit({ actorId: req.user.id, action: 'ENROLLMENT_WITHDRAWN', entityType: 'enrollment', entityId: request.id });
    return ok(res, updated);
  }),
);

router.post(
  '/:id/review',
  authenticate,
  allowRoles('REGISTRAR', 'ADMISSION'),
  validate(z.object({ id: z.string().uuid('Invalid request id') }), 'params'),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const request = await prisma.enrollmentRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Enrollment request not found' } });
    if (request.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'ALREADY_REVIEWED', message: 'This request has already been reviewed.' } });
    }

    const nextStatus = req.body.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.enrollmentRequest.update({
      where: { id: request.id },
      data: { status: nextStatus, reviewNotes: req.body.reviewNotes, reviewedById: req.user.id, reviewedAt: new Date() },
      include: buildRequestInclude(),
    });

    await audit({
      actorId: req.user.id,
      action: 'ENROLLMENT_' + nextStatus,
      entityType: 'enrollment',
      entityId: request.id,
    });
    return ok(res, updated);
  }),
);

export default router;