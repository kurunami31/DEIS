import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const COUNSELING_TYPES = ['ACADEMIC', 'PERSONAL', 'CAREER', 'GROUP'];
const SESSION_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const ASSESSMENT_TYPES = ['PSYCHOLOGICAL', 'PERSONALITY', 'APTITUDE', 'INTEREST'];

const sessionCreateSchema = z.object({
  studentId: z.string().uuid(),
  counselorId: z.string().uuid().optional(),
  type: z.enum(COUNSELING_TYPES),
  concern: z.string().trim().min(5).max(500),
  scheduledAt: z.coerce.date(),
});

const sessionUpdateSchema = z.object({
  status: z.enum(SESSION_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
  recommendation: z.string().max(2000).optional(),
  completedAt: z.coerce.date().optional(),
});

const assessmentCreateSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(ASSESSMENT_TYPES),
  score: z.number().int().min(0).max(100).optional(),
  result: z.string().max(100).optional(),
  interpretation: z.string().max(2000).optional(),
  assessedAt: z.coerce.date(),
  assessedBy: z.string().max(100).optional(),
});

const assessmentUpdateSchema = z.object({
  score: z.number().int().min(0).max(100).optional(),
  result: z.string().max(100).optional(),
  interpretation: z.string().max(2000).optional(),
});

const querySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  type: z.enum(COUNSELING_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/oscd/dashboard — OSCD dashboard stats
router.get(
  '/dashboard',
  authenticate,
  allowRoles('OSCD', 'ADMIN', 'REGISTRAR'),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSessions, scheduledSessions, completedThisMonth, totalAssessments, atRiskStudents] = await Promise.all([
      prisma.counselingSession.count(),
      prisma.counselingSession.count({ where: { status: 'SCHEDULED' } }),
      prisma.counselingSession.count({ where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } } }),
      prisma.studentAssessment.count(),
      prisma.studentAssessment.count({ where: { result: 'AT_RISK' } }),
    ]);

    return ok(res, {
      totalSessions,
      scheduledSessions,
      completedThisMonth,
      totalAssessments,
      atRiskStudents,
    });
  }),
);

// GET /api/oscd/sessions — List counseling sessions
router.get(
  '/sessions',
  authenticate,
  allowRoles('OSCD', 'ADMIN', 'REGISTRAR'),
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { studentId, status, type, page, limit } = req.validated.query;
    const where = {
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.counselingSession.findMany({
        where,
        include: {
          student: { select: { id: true, studentNo: true, firstName: true, lastName: true, program: { select: { name: true } } } },
          counselor: { select: { id: true, fullName: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.counselingSession.count({ where }),
    ]);

    return ok(res, { sessions, total, page, limit });
  }),
);

// POST /api/oscd/sessions — Create counseling session
router.post(
  '/sessions',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(sessionCreateSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { id: req.body.studentId } });
    if (!student) throw new NotFoundError('Student not found.');

    const counselorId = req.body.counselorId || req.user.id;

    const session = await prisma.counselingSession.create({
      data: {
        studentId: req.body.studentId,
        counselorId,
        type: req.body.type,
        concern: req.body.concern,
        scheduledAt: req.body.scheduledAt,
      },
      include: {
        student: { select: { studentNo: true, firstName: true, lastName: true } },
        counselor: { select: { fullName: true } },
      },
    });

    await audit({ actorId: req.user.id, action: 'COUNSELING_SESSION_CREATED', entityType: 'counseling_session', entityId: session.id });
    return created(res, session);
  }),
);

// PATCH /api/oscd/sessions/:id — Update counseling session
router.patch(
  '/sessions/:id',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(sessionUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.counselingSession.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Session not found.');

    const session = await prisma.counselingSession.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        student: { select: { studentNo: true, firstName: true, lastName: true } },
        counselor: { select: { fullName: true } },
      },
    });

    await audit({ actorId: req.user.id, action: 'COUNSELING_SESSION_UPDATED', entityType: 'counseling_session', entityId: session.id });
    return ok(res, session);
  }),
);

// DELETE /api/oscd/sessions/:id — Delete counseling session
router.delete(
  '/sessions/:id',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.counselingSession.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Session not found.');

    await prisma.counselingSession.delete({ where: { id: req.params.id } });
    await audit({ actorId: req.user.id, action: 'COUNSELING_SESSION_DELETED', entityType: 'counseling_session', entityId: req.params.id });
    return ok(res, { deleted: true });
  }),
);

// GET /api/oscd/assessments — List student assessments
router.get(
  '/assessments',
  authenticate,
  allowRoles('OSCD', 'ADMIN', 'REGISTRAR'),
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { studentId, type, page, limit } = req.validated.query;
    const where = {
      ...(studentId ? { studentId } : {}),
      ...(type ? { type } : {}),
    };

    const [assessments, total] = await Promise.all([
      prisma.studentAssessment.findMany({
        where,
        include: { student: { select: { id: true, studentNo: true, firstName: true, lastName: true, program: { select: { name: true } } } } },
        orderBy: { assessedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studentAssessment.count({ where }),
    ]);

    return ok(res, { assessments, total, page, limit });
  }),
);

// POST /api/oscd/assessments — Create student assessment
router.post(
  '/assessments',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(assessmentCreateSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { id: req.body.studentId } });
    if (!student) throw new NotFoundError('Student not found.');

    const assessment = await prisma.studentAssessment.create({
      data: {
        studentId: req.body.studentId,
        type: req.body.type,
        score: req.body.score,
        result: req.body.result,
        interpretation: req.body.interpretation,
        assessedAt: req.body.assessedAt,
        assessedBy: req.body.assessedBy || req.user.fullName,
      },
      include: { student: { select: { studentNo: true, firstName: true, lastName: true } } },
    });

    await audit({ actorId: req.user.id, action: 'STUDENT_ASSESSMENT_CREATED', entityType: 'student_assessment', entityId: assessment.id });
    return created(res, assessment);
  }),
);

// PATCH /api/oscd/assessments/:id — Update student assessment
router.patch(
  '/assessments/:id',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(assessmentUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.studentAssessment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Assessment not found.');

    const assessment = await prisma.studentAssessment.update({
      where: { id: req.params.id },
      data: req.body,
      include: { student: { select: { studentNo: true, firstName: true, lastName: true } } },
    });

    await audit({ actorId: req.user.id, action: 'STUDENT_ASSESSMENT_UPDATED', entityType: 'student_assessment', entityId: assessment.id });
    return ok(res, assessment);
  }),
);

// DELETE /api/oscd/assessments/:id — Delete student assessment
router.delete(
  '/assessments/:id',
  authenticate,
  allowRoles('OSCD', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.studentAssessment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Assessment not found.');

    await prisma.studentAssessment.delete({ where: { id: req.params.id } });
    await audit({ actorId: req.user.id, action: 'STUDENT_ASSESSMENT_DELETED', entityType: 'student_assessment', entityId: req.params.id });
    return ok(res, { deleted: true });
  }),
);

// GET /api/oscd/at-risk — List at-risk students
router.get(
  '/at-risk',
  authenticate,
  allowRoles('OSCD', 'ADMIN', 'REGISTRAR'),
  asyncHandler(async (req, res) => {
    const atRisk = await prisma.studentAssessment.findMany({
      where: { result: 'AT_RISK' },
      include: { student: { select: { id: true, studentNo: true, firstName: true, lastName: true, program: { select: { name: true } } } } },
      orderBy: { assessedAt: 'desc' },
      distinct: ['studentId'],
    });

    return ok(res, atRisk);
  }),
);

export default router;
