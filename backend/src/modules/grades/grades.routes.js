import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { ForbiddenError, NotFoundError, UnprocessableError } from '../../lib/http.js';

const GRADE_RANGE_SCHEMA = z.coerce
  .number()
  .min(1.0)
  .max(5.0)
  .optional();

const gradeEntrySchema = z.object({
  studentId: z.string().uuid(),
  prelim: GRADE_RANGE_SCHEMA,
  midterm: GRADE_RANGE_SCHEMA,
  final: GRADE_RANGE_SCHEMA,
});

const bulkGradeSchema = z.object({
  records: z.array(gradeEntrySchema).min(1).max(100),
});

const router = Router();

router.put(
  '/section/:sectionId/records',
  authenticate,
  allowRoles('FACULTY'),
  validate(z.object({ sectionId: z.string().uuid() }), 'params'),
  validate(bulkGradeSchema),
  asyncHandler(async (req, res) => {
    const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
    if (!section) throw new NotFoundError('Section not found.');
    if (section.facultyId !== req.user.id) throw new ForbiddenError('Only the assigned faculty may encode grades.');

    // Finalized grades are official records: encoding is locked until the
    // registrar reopens the section for correction (see /reopen).
    const finalized = await prisma.gradeRecord.findFirst({
      where: { sectionId: section.id, status: 'FINALIZED' },
      select: { id: true },
    });
    if (finalized) {
      throw new UnprocessableError('Grades are finalized for this section. Ask the Registrar to reopen it before making changes.');
    }

    const roster = await prisma.enrollmentItem.findMany({
      where: { sectionId: section.id, request: { status: { in: ['PENDING', 'APPROVED'] } } },
      select: { request: { select: { studentId: true } } },
    });
    const rosterIds = new Set(roster.map((r) => r.request.studentId));
    const submittedIds = new Set(req.body.records.map((r) => r.studentId));

    // Never allow grading a student who is not on the roster.
    if ([...submittedIds].some((id) => !rosterIds.has(id))) {
      throw new UnprocessableError('One or more students are not enrolled in this section.');
    }

    const updates = [];
    for (const entry of req.body.records) {
      const grade = computeGrade(entry.prelim, entry.midterm, entry.final);
      updates.push(
        prisma.gradeRecord.upsert({
          where: {
            sectionId_studentId: { sectionId: section.id, studentId: entry.studentId },
          },
          create: {
            sectionId: section.id,
            studentId: entry.studentId,
            prelim: entry.prelim,
            midterm: entry.midterm,
            final: entry.final,
            grade,
            status: 'DRAFT',
            gradedById: req.user.id,
          },
          update: {
            prelim: entry.prelim,
            midterm: entry.midterm,
            final: entry.final,
            grade,
            status: 'DRAFT',
            gradedById: req.user.id,
          },
        }),
      );
    }

    const saved = await prisma.$transaction(updates);
    await audit({ actorId: req.user.id, action: 'GRADES_ENCODED', entityType: 'section', entityId: section.id });
    return ok(res, saved);
  }),
);

router.post(
  '/section/:sectionId/finalize',
  authenticate,
  allowRoles('FACULTY', 'REGISTRAR'),
  validate(z.object({ sectionId: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
    if (!section) throw new NotFoundError('Section not found.');
    if (req.user.role === 'FACULTY' && section.facultyId !== req.user.id) {
      throw new ForbiddenError('Only the assigned faculty member can finalize this section.');
    }

    // Every APPROVED student must have a computed grade; a student with no
    // grade record at all must not slip through finalization. (Pending
    // enrollments are excluded — their requests may still be rejected.)
    const roster = await prisma.enrollmentItem.findMany({
      where: { sectionId: section.id, request: { status: 'APPROVED' } },
      select: { request: { select: { studentId: true } } },
    });
    const graded = await prisma.gradeRecord.findMany({
      where: { sectionId: section.id, grade: { not: null } },
      select: { studentId: true },
    });
    const gradedIds = new Set(graded.map((g) => g.studentId));
    const missing = roster.filter((r) => !gradedIds.has(r.request.studentId));
    if (missing.length > 0) {
      throw new UnprocessableError('All enrolled students must have a computed grade before finalizing.');
    }

    const updated = await prisma.$transaction([
      prisma.gradeRecord.updateMany({
        where: { sectionId: section.id },
        data: { status: 'FINALIZED' },
      }),
    ]);

    await audit({ actorId: req.user.id, action: 'SECTION_FINALIZED', entityType: 'section', entityId: section.id });
    return ok(res, { finalized: updated[0].count });
  }),
);

// Registrar-controlled correction flow: reopens a finalized section so the
// assigned faculty can fix grades. The change is audited and the grades go
// back to DRAFT, so nothing is ever silently rewritten.
router.post(
  '/section/:sectionId/reopen',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  validate(z.object({ sectionId: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
    if (!section) throw new NotFoundError('Section not found.');
    const updated = await prisma.gradeRecord.updateMany({
      where: { sectionId: section.id, status: 'FINALIZED' },
      data: { status: 'DRAFT' },
    });
    await audit({ actorId: req.user.id, action: 'SECTION_REOPENED', entityType: 'section', entityId: section.id });
    return ok(res, { reopened: updated.count });
  }),
);

const GRADE_WEIGHTS = { prelim: 0.3, midterm: 0.3, final: 0.4 };
const ROUND = (n) => Math.round(n * 100) / 100;

function computeGrade(prelim, midterm, final) {
  if (prelim == null || midterm == null || final == null) return null;
  return ROUND(prelim * GRADE_WEIGHTS.prelim + midterm * GRADE_WEIGHTS.midterm + final * GRADE_WEIGHTS.final);
}

export default router;