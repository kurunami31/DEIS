import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const MEDICAL_TEST_TYPES = ['DRUG_TEST', 'PHYSICAL_EXAM', 'VISION_TEST', 'HEARING_TEST', 'CHEST_XRAY', 'BLOOD_TEST'];
const RESULTS = ['PASSED', 'FAILED', 'CONDITIONAL'];

const recordCreateSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(MEDICAL_TEST_TYPES),
  result: z.enum(RESULTS),
  details: z.any().optional(),
  testedAt: z.coerce.date(),
  testedBy: z.string().max(100).optional(),
  fileUrl: z.string().url().optional(),
});

const recordUpdateSchema = z.object({
  result: z.enum(RESULTS).optional(),
  details: z.any().optional(),
  testedAt: z.coerce.date().optional(),
  testedBy: z.string().max(100).optional(),
  fileUrl: z.string().url().optional(),
});

const querySchema = z.object({
  studentId: z.string().uuid().optional(),
  type: z.enum(MEDICAL_TEST_TYPES).optional(),
  result: z.enum(RESULTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/ohs/dashboard — OHS dashboard stats
router.get(
  '/dashboard',
  authenticate,
  allowRoles('OHS', 'ADMIN', 'REGISTRAR'),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRecords, passedThisMonth, failedThisMonth, pendingClearances] = await Promise.all([
      prisma.medicalRecord.count(),
      prisma.medicalRecord.count({ where: { result: 'PASSED', createdAt: { gte: startOfMonth } } }),
      prisma.medicalRecord.count({ where: { result: 'FAILED', createdAt: { gte: startOfMonth } } }),
      prisma.studentClearance.count({
        where: {
          status: 'IN_PROGRESS',
          signoffs: { some: { template: { ownerRole: 'OHS' }, status: 'PENDING' } },
        },
      }),
    ]);

    return ok(res, {
      totalRecords,
      passedThisMonth,
      failedThisMonth,
      pendingClearances,
    });
  }),
);

// GET /api/ohs/records — List medical records
router.get(
  '/records',
  authenticate,
  allowRoles('OHS', 'ADMIN', 'REGISTRAR'),
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { studentId, type, result, page, limit } = req.validated.query;
    const where = {
      ...(studentId ? { studentId } : {}),
      ...(type ? { type } : {}),
      ...(result ? { result } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        include: { student: { select: { id: true, studentNo: true, firstName: true, lastName: true, program: { select: { name: true } } } } },
        orderBy: { testedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    return ok(res, { records, total, page, limit });
  }),
);

// POST /api/ohs/records — Create medical record
router.post(
  '/records',
  authenticate,
  allowRoles('OHS', 'ADMIN'),
  validate(recordCreateSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { id: req.body.studentId } });
    if (!student) throw new NotFoundError('Student not found.');

    const record = await prisma.medicalRecord.create({
      data: {
        studentId: req.body.studentId,
        type: req.body.type,
        result: req.body.result,
        details: req.body.details,
        testedAt: req.body.testedAt,
        testedBy: req.body.testedBy || req.user.fullName,
        fileUrl: req.body.fileUrl,
      },
      include: { student: { select: { studentNo: true, firstName: true, lastName: true } } },
    });

    await audit({ actorId: req.user.id, action: 'MEDICAL_RECORD_CREATED', entityType: 'medical_record', entityId: record.id });
    return created(res, record);
  }),
);

// PATCH /api/ohs/records/:id — Update medical record
router.patch(
  '/records/:id',
  authenticate,
  allowRoles('OHS', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(recordUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.medicalRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Medical record not found.');

    const record = await prisma.medicalRecord.update({
      where: { id: req.params.id },
      data: req.body,
      include: { student: { select: { studentNo: true, firstName: true, lastName: true } } },
    });

    await audit({ actorId: req.user.id, action: 'MEDICAL_RECORD_UPDATED', entityType: 'medical_record', entityId: record.id });
    return ok(res, record);
  }),
);

// DELETE /api/ohs/records/:id — Delete medical record
router.delete(
  '/records/:id',
  authenticate,
  allowRoles('OHS', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.medicalRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Medical record not found.');

    await prisma.medicalRecord.delete({ where: { id: req.params.id } });
    await audit({ actorId: req.user.id, action: 'MEDICAL_RECORD_DELETED', entityType: 'medical_record', entityId: req.params.id });
    return ok(res, { deleted: true });
  }),
);

export default router;
