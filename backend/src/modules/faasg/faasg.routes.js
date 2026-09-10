import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const EVAL_CATEGORIES = ['TEACHING', 'SERVICE', 'RESEARCH', 'EXTENSION'];
const TRAINING_STATUSES = ['UPCOMING', 'COMPLETED', 'CANCELLED'];
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticate, allowRoles('FAASG', 'ADMIN'), asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalEvaluations, thisMonthEvals, avgRating, upcomingTrainings, completedTrainings] = await Promise.all([
    prisma.facultyEvaluation.count(),
    prisma.facultyEvaluation.count({ where: { evaluatedAt: { gte: startOfMonth } } }),
    prisma.facultyEvaluation.aggregate({ _avg: { rating: true } }),
    prisma.trainingRecord.count({ where: { status: 'UPCOMING' } }),
    prisma.trainingRecord.count({ where: { status: 'COMPLETED' } }),
  ]);

  return ok(res, {
    totalEvaluations,
    thisMonthEvals,
    avgRating: Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
    upcomingTrainings,
    completedTrainings,
  });
}));

// ---------------------------------------------------------------------------
// Faculty Evaluations
// ---------------------------------------------------------------------------
const evalCreateSchema = z.object({
  facultyId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  termId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional(),
  category: z.enum(EVAL_CATEGORIES),
});

router.get('/evaluations', authenticate, allowRoles('FAASG', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [evaluations, total] = await Promise.all([
    prisma.facultyEvaluation.findMany({
      include: {
        faculty: { select: { id: true, fullName: true } },
        student: { select: { studentNo: true, firstName: true, lastName: true } },
        term: { select: { code: true, label: true } },
      },
      orderBy: { evaluatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facultyEvaluation.count(),
  ]);
  return ok(res, { evaluations, total, page, limit });
}));

router.post('/evaluations', authenticate, allowRoles('FAASG', 'ADMIN'), validate(evalCreateSchema), asyncHandler(async (req, res) => {
  const evaluation = await prisma.facultyEvaluation.create({
    data: {
      facultyId: req.body.facultyId,
      studentId: req.body.studentId || null,
      sectionId: req.body.sectionId || null,
      termId: req.body.termId,
      rating: req.body.rating,
      comments: req.body.comments,
      category: req.body.category,
    },
  });
  await audit({ actorId: req.user.id, action: 'FACULTY_EVAL_CREATED', entityType: 'faculty_evaluation', entityId: evaluation.id });
  return created(res, evaluation);
}));

router.delete('/evaluations/:id', authenticate, allowRoles('FAASG', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.facultyEvaluation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Evaluation not found.');
  await prisma.facultyEvaluation.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'FACULTY_EVAL_DELETED', entityType: 'faculty_evaluation', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Training Records
// ---------------------------------------------------------------------------
const trainingCreateSchema = z.object({
  facultyId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  provider: z.string().max(100).optional(),
  hours: z.number().int().min(0).default(0),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
});
const trainingUpdateSchema = z.object({
  status: z.enum(TRAINING_STATUSES).optional(),
  notes: z.string().max(500).optional(),
});

router.get('/trainings', authenticate, allowRoles('FAASG', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [trainings, total] = await Promise.all([
    prisma.trainingRecord.findMany({
      include: { faculty: { select: { id: true, fullName: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trainingRecord.count(),
  ]);
  return ok(res, { trainings, total, page, limit });
}));

router.post('/trainings', authenticate, allowRoles('FAASG', 'ADMIN'), validate(trainingCreateSchema), asyncHandler(async (req, res) => {
  const training = await prisma.trainingRecord.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'TRAINING_RECORD_CREATED', entityType: 'training_record', entityId: training.id });
  return created(res, training);
}));

router.patch('/trainings/:id', authenticate, allowRoles('FAASG', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(trainingUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.trainingRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Training record not found.');
  const training = await prisma.trainingRecord.update({ where: { id: req.params.id }, data: req.body });
  await audit({ actorId: req.user.id, action: 'TRAINING_RECORD_UPDATED', entityType: 'training_record', entityId: training.id });
  return ok(res, training);
}));

router.delete('/trainings/:id', authenticate, allowRoles('FAASG', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.trainingRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Training record not found.');
  await prisma.trainingRecord.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'TRAINING_RECORD_DELETED', entityType: 'training_record', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

export default router;
