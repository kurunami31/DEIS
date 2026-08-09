import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';

const router = Router();

router.get(
  '/me',
  authenticate,
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        program: { include: { faculty: true, campus: true } },
        campus: true,
        enrollmentRequests: {
          include: { term: true, items: { include: { section: { include: { subject: true } } } } },
          orderBy: { submittedAt: 'desc' },
        },
        grades: {
          include: { section: { include: { subject: true, term: true } } },
          orderBy: { section: { term: { startDate: 'desc' } } },
        },
      },
    });
    return ok(res, student);
  }),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  programId: z.string().uuid().optional(),
  campusId: z.string().uuid().optional(),
  yearLevel: z.coerce.number().int().min(1).max(6).optional(),
  search: z.string().optional(),
});

router.get(
  '/',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, programId, campusId, yearLevel, search } = req.validated.query;

    const where = {
      ...(programId ? { programId } : {}),
      ...(campusId ? { campusId } : {}),
      ...(yearLevel ? { yearLevel } : {}),
      ...(search
        ? {
            OR: [
              { studentNo: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, students] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { program: true, campus: true, user: { select: { role: true, isActive: true } } },
        orderBy: { studentNo: 'asc' },
      }),
    ]);

    return ok(res, { items: students, total, page, pageSize });
  }),
);

router.get(
  '/:id',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.id },
      include: {
        program: { include: { faculty: true } },
        campus: true,
        user: { select: { fullName: true, email: true, isActive: true } },
        enrollmentRequests: {
          include: { term: true, items: { include: { section: { include: { subject: true } } } } },
          orderBy: { submittedAt: 'desc' },
        },
        grades: {
          include: { section: { include: { subject: true, term: true } } },
          orderBy: { section: { term: { startDate: 'desc' } } },
        },
      },
    });
    if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found' } });
    return ok(res, student);
  }),
);

export default router;