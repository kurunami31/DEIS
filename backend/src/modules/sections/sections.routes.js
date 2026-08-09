import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const sectionListQuery = z.object({
  termId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  facultyId: z.string().uuid().optional(),
  search: z.string().optional(),
});

router.get(
  '/',
  authenticate,
  validate(sectionListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { termId, subjectId, facultyId, search } = req.validated.query;

    const where = {
      ...(termId ? { termId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(facultyId ? { facultyId } : {}),
      ...(search
        ? { OR: [{ code: { contains: search, mode: 'insensitive' } }, { subject: { title: { contains: search, mode: 'insensitive' } } }] }
        : {}),
    };

    const sections = await prisma.section.findMany({
      where,
      include: {
        subject: true,
        term: true,
        faculty: { select: { fullName: true } },
      },
      orderBy: { code: 'asc' },
    });

    const items = await prisma.enrollmentItem.groupBy({
      by: ['sectionId'],
      where: { sectionId: { in: sections.map((s) => s.id) }, request: { status: { in: ['PENDING', 'APPROVED'] } } },
      _count: true,
    });

    const seatMap = Object.fromEntries(items.map((i) => [i.sectionId, i._count]));
    return ok(
      res,
      sections.map((section) => ({
        ...section,
        seatsTaken: seatMap[section.id] ?? 0,
        seatsLeft: Math.max(0, section.capacity - (seatMap[section.id] ?? 0)),
      })),
    );
  }),
);

const createSectionSchema = z.object({
  code: z.string().min(2).max(16),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  facultyId: z.string().uuid(),
  schedule: z.string().min(5),
  room: z.string().min(1),
  capacity: z.coerce.number().int().min(5).max(200),
});

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'REGISTRAR'),
  validate(createSectionSchema),
  asyncHandler(async (req, res) => {
    const section = await prisma.section.create({ data: req.body });
    await audit({ actorId: req.user.id, action: 'SECTION_CREATED', entityType: 'section', entityId: section.id });
    return created(res, section);
  }),
);

router.get(
  '/my',
  authenticate,
  allowRoles('FACULTY'),
  asyncHandler(async (req, res) => {
    const sections = await prisma.section.findMany({
      where: { facultyId: req.user.id },
      include: { subject: true, term: true, _count: { select: { items: true } } },
      orderBy: { code: 'asc' },
    });
    return ok(res, sections);
  }),
);

router.get(
  '/:id/roster',
  authenticate,
  allowRoles('FACULTY', 'REGISTRAR', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const section = await prisma.section.findUnique({
      where: { id: req.params.id },
      include: {
        subject: true,
        term: true,
        faculty: { select: { fullName: true, email: true } },
        items: {
          where: { request: { status: { in: ['PENDING', 'APPROVED'] } } },
          include: { request: { include: { student: { include: { program: true } } } } },
          orderBy: { request: { student: { lastName: 'asc' } } },
        },
      },
    });
    if (!section) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Section not found' } });

    const studentIds = section.items.map((item) => item.request.student.id);
    const grades = await prisma.gradeRecord.findMany({
      where: { sectionId: section.id, studentId: { in: studentIds } },
    });
    const gradeMap = Object.fromEntries(grades.map((g) => [g.studentId, g]));

    return ok(res, {
      ...section,
      roster: section.items.map((item) => ({
        enrollmentItemId: item.id,
        student: item.request.student,
        grade: gradeMap[item.request.student.id] ?? null,
      })),
    });
  }),
);

export default router;