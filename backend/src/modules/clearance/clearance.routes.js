import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { NotFoundError, UnprocessableError } from '../../lib/http.js';

const router = Router();

const signoffInclude = { include: { template: true, reviewedBy: { select: { fullName: true } } }, orderBy: { template: { code: 'asc' } } };

async function ensureClearanceFor(studentId, termId) {
  return prisma.studentClearance.upsert({
    where: { studentId_termId: { studentId, termId } },
    create: {
      studentId,
      termId,
      signoffs: {
        create: (await prisma.clearanceTemplate.findMany({ orderBy: { code: 'asc' } })).map((t) => ({
          templateId: t.id,
        })),
      },
    },
    update: {},
    include: { signoffs: signoffInclude },
  });
}

// ------------------------------------------------------------- student view
router.get(
  '/my',
  authenticate,
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const requests = await prisma.enrollmentRequest.findMany({
      where: { studentId: student.id },
      include: { term: true },
      orderBy: { submittedAt: 'desc' },
    });
    const withTerm = requests.filter((r) => r.term);
    const term = withTerm[0]?.term ?? (await prisma.term.findFirst({ where: { isActive: true } }));
    if (!term) return ok(res, { clearance: null, templates: [], reasons: [] });

    const clearance = await ensureClearanceFor(student.id, term.id);
    const templates = await prisma.clearanceTemplate.findMany({ orderBy: { code: 'asc' } });
    const subjects = await prisma.enrollmentItem.findMany({
      where: { request: { studentId: student.id, termId: term.id, status: 'APPROVED' } },
      select: { section: { select: { subject: { select: { title: true } } } } },
    });
    return ok(res, { clearance, term, templates, subjects: subjects.map((r) => r.section.subject.title) });
  }),
);

// --------------------------------------------------------------- registrar
const listQuerySchema = z.object({ termId: z.string().uuid().optional(), status: z.enum(['IN_PROGRESS', 'CLEARED']).optional(), search: z.string().optional() });

router.get(
  '/',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { termId, status, search } = req.validated.query;
    const activeTerm = termId
      ? { id: termId }
      : await prisma.term.findFirst({ where: { isActive: true } }).then((t) => t ?? null);
    if (!activeTerm) return ok(res, { items: [], total: 0 });

    const where = {
      termId: activeTerm.id,
      ...(status ? { status } : {}),
      ...(search
        ? { student: { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { studentNo: { contains: search, mode: 'insensitive' } }] } }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.studentClearance.count({ where }),
      prisma.studentClearance.findMany({
        where,
        include: {
          student: { include: { program: true } },
          signoffs: signoffInclude,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return ok(res, { items, total, term: activeTerm });
  }),
);

router.patch(
  '/:id/signoff',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(z.object({ templateId: z.string().uuid(), status: z.enum(['PENDING', 'CLEARED']), note: z.string().trim().max(255).optional() })),
  asyncHandler(async (req, res) => {
    const signoff = await prisma.clearanceSignoff.findFirst({
      where: { clearanceId: req.params.id, templateId: req.body.templateId },
    });
    if (!signoff) throw new NotFoundError('Clearance item not found.');

    await prisma.clearanceSignoff.update({
      where: { id: signoff.id },
      data: {
        status: req.body.status,
        note: req.body.note,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });

    const all = await prisma.clearanceSignoff.findMany({ where: { clearanceId: req.params.id } });
    const cleared = all.filter((s) => s.status === 'CLEARED').length;
    const complete = cleared === all.length;
    if (complete) {
      await prisma.studentClearance.update({ where: { id: req.params.id }, data: { status: 'CLEARED' } });
    } else {
      await prisma.studentClearance.update({ where: { id: req.params.id }, data: { status: 'IN_PROGRESS' } });
    }

    await audit({
      actorId: req.user.id,
      action: req.body.status === 'CLEARED' ? 'CLEARANCE_ITEM_CLEARED' : 'CLEARANCE_ITEM_REOPENED',
      entityType: 'clearance',
      entityId: req.params.id,
      meta: { templateId: req.body.templateId },
    });

    const updated = await prisma.studentClearance.findUnique({
      where: { id: req.params.id },
      include: { signoffs: signoffInclude, student: { include: { program: true } } },
    });
    return ok(res, updated);
  }),
);

// ------------------------------------------------------------ admin only
router.get(
  '/templates',
  authenticate,
  allowRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const templates = await prisma.clearanceTemplate.findMany({ orderBy: { code: 'asc' } });
    return ok(res, templates);
  }),
);

router.post(
  '/templates',
  authenticate,
  allowRoles('ADMIN'),
  validate(z.object({ code: z.string().trim().min(1).max(20), label: z.string().trim().min(2).max(100), category: z.string().trim().min(2).max(50) })),
  asyncHandler(async (req, res) => {
    const template = await prisma.clearanceTemplate.create({ data: req.body });
    await audit({ actorId: req.user.id, action: 'CLEARANCE_TEMPLATE_CREATED', entityType: 'clearance-template', entityId: template.id });
    return created(res, template);
  }),
);

router.delete(
  '/templates/:id',
  authenticate,
  allowRoles('ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const inUse = await prisma.clearanceSignoff.findFirst({ where: { templateId: req.params.id } });
    if (inUse) throw new UnprocessableError('Template is already in use and cannot be deleted.');
    await prisma.clearanceTemplate.delete({ where: { id: req.params.id } });
    await audit({ actorId: req.user.id, action: 'CLEARANCE_TEMPLATE_DELETED', entityType: 'clearance-template', entityId: req.params.id });
    return ok(res, { ok: true });
  }),
);

export default router;