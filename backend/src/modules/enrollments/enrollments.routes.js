import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { submitSchema, reviewSchema, paymentSchema } from './enrollments.schema.js';
import { validateEnrollment, recordPayment, loadPolicy, boolOf } from './enrollments.service.js';
import { computeGwa, findBacklogs, allowedUnitsFor } from './enrollments.rules.js';

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

    const [sections, passed, enrollmentItems, gwa, backlogs, policy] = await Promise.all([
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
      // Seat counts are computed for the whole term in the same round trip;
      // only the sections shown to this student are surfaced below.
      prisma.enrollmentItem.findMany({
        where: {
          section: { termId: term.id },
          request: { status: { in: ['PENDING', 'APPROVED'] } },
        },
        select: { sectionId: true },
      }),
      computeGwa(student.id),
      findBacklogs(student.id),
      loadPolicy(),
    ]);
    const passedSet = new Set(passed.map((p) => p.section.subjectId));
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

    return ok(res, {
      term,
      sections: serialized,
      evaluation: {
        gwa,
        backlogs: backlogs.map((b) => ({ id: b.id, code: b.code, title: b.title, units: b.units })),
        allowedUnits: allowedUnitsFor(gwa, backlogs.length, policy),
      },
    });
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

// Online-payment stub: records that the assessment fee was settled for this
// request. The reference is a stand-in for a real payment gateway receipt.
router.post(
  '/:id/payment',
  authenticate,
  requireStudent,
  validate(z.object({ id: z.string().uuid('Invalid request id') }), 'params'),
  validate(paymentSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const paid = await recordPayment(req.params.id, student.id, req.body);
    await audit({
      actorId: req.user.id,
      action: 'ENROLLMENT_PAID',
      entityType: 'enrollment',
      entityId: req.params.id,
      meta: { reference: paid.paymentRef },
    });
    return ok(res, paid);
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
    if (nextStatus === 'APPROVED') {
      const policy = await loadPolicy();
      if (boolOf(policy.REQUIRE_PAYMENT_BEFORE_APPROVAL) && !request.paymentPaidAt) {
        return res.status(422).json({
          error: {
            code: 'PAYMENT_REQUIRED',
            message: 'This request cannot be approved until the assessment fee is paid.',
          },
        });
      }
    }
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