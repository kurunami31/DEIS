import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { z } from 'zod';

const router = Router();

router.get(
  '/campuses',
  asyncHandler(async (req, res) => {
    const campuses = await prisma.campus.findMany({
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { students: true } } },
    });
    return ok(res, campuses);
  }),
);

router.get(
  '/faculties',
  asyncHandler(async (req, res) => {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: { campus: true, _count: { select: { programs: true } } },
    });
    return ok(res, faculties);
  }),
);

router.get(
  '/programs',
  asyncHandler(async (req, res) => {
    const programs = await prisma.program.findMany({
      orderBy: { name: 'asc' },
      include: { faculty: true, campus: true, _count: { select: { subjects: true } } },
    });
    return ok(res, programs);
  }),
);

router.get(
  '/programs/:id',
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const program = await prisma.program.findUnique({
      where: { id: req.params.id },
      include: { subjects: { orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }] }, faculty: true, campus: true },
    });
    if (!program) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Program not found' } });
    return ok(res, program);
  }),
);

router.get(
  '/subjects',
  asyncHandler(async (req, res) => {
    const { programId, query: q } = req.query;
    const subjects = await prisma.subject.findMany({
      where: {
        ...(typeof programId === 'string' ? { programId } : {}),
        ...(typeof q === 'string' && q.trim()
          ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }
          : {}),
      },
      include: { requires: { include: { prereq: true } } },
      orderBy: [{ programId: 'asc' }, { yearLevel: 'asc' }, { semester: 'asc' }],
    });
    return ok(res, subjects);
  }),
);

router.get(
  '/terms',
  asyncHandler(async (req, res) => {
    const terms = await prisma.term.findMany({ orderBy: { startDate: 'desc' } });
    return ok(res, terms);
  }),
);

router.post(
  '/terms',
  authenticate,
  allowRoles('ADMIN', 'REGISTRAR'),
  validate(
    z.object({
      code: z.string().min(3),
      label: z.string().min(3),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      isActive: z.boolean().default(false),
      enrollmentOpen: z.boolean().default(false),
      activate: z.boolean().default(false),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { activate, isActive, enrollmentOpen, ...rest } = req.body;
    const term = await prisma.$transaction(async (tx) => {
      if (activate) {
        await tx.term.updateMany({ data: { isActive: false, enrollmentOpen: false } });
      }
      return tx.term.create({
        data: { ...rest, isActive: activate || isActive, enrollmentOpen: activate || enrollmentOpen },
      });
    });
    return created(res, term);
  }),
);

router.patch(
  '/terms/:id',
  authenticate,
  allowRoles('ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(
    z.object({
      isActive: z.boolean().optional(),
      enrollmentOpen: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { isActive, enrollmentOpen } = req.body;
    const updates = await prisma.$transaction(async (tx) => {
      if (isActive === true) {
        await tx.term.updateMany({ data: { isActive: false } });
        await tx.term.update({ where: { id: req.params.id }, data: { isActive: true } });
      } else if (isActive === false) {
        await tx.term.update({ where: { id: req.params.id }, data: { isActive: false } });
      }
      if (enrollmentOpen !== undefined) {
        await tx.term.update({ where: { id: req.params.id }, data: { enrollmentOpen } });
      }
      return tx.term.findUnique({ where: { id: req.params.id } });
    });
    if (!updates) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Term not found' } });
    await audit({ actorId: req.user.id, action: 'TERM_UPDATED', entityType: 'term', entityId: req.params.id });
    return ok(res, updates);
  }),
);

export default router;