import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const ADMISSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'];
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticate, allowRoles('ADMISSION', 'ADMIN'), asyncHandler(async (req, res) => {
  const [total, pending, approved, rejected, waitlisted] = await Promise.all([
    prisma.admissionApplication.count(),
    prisma.admissionApplication.count({ where: { status: 'PENDING' } }),
    prisma.admissionApplication.count({ where: { status: 'APPROVED' } }),
    prisma.admissionApplication.count({ where: { status: 'REJECTED' } }),
    prisma.admissionApplication.count({ where: { status: 'WAITLISTED' } }),
  ]);
  return ok(res, { total, pending, approved, rejected, waitlisted });
}));

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
const appCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  programId: z.string().uuid(),
  incomingYear: z.number().int().min(1).max(6).default(1),
  previousSchool: z.string().max(100).optional(),
});

const reviewSchema = z.object({
  status: z.enum(ADMISSION_STATUSES),
  remarks: z.string().max(500).optional(),
});

router.get('/applications', authenticate, allowRoles('ADMISSION', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [applications, total] = await Promise.all([
    prisma.admissionApplication.findMany({
      include: { program: { select: { id: true, name: true } }, reviewedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.admissionApplication.count(),
  ]);
  return ok(res, { applications, total, page, limit });
}));

router.post('/applications', authenticate, allowRoles('ADMISSION', 'ADMIN'), validate(appCreateSchema), asyncHandler(async (req, res) => {
  const app = await prisma.admissionApplication.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'ADMISSION_APP_CREATED', entityType: 'admission_application', entityId: app.id });
  return created(res, app);
}));

router.patch('/applications/:id', authenticate, allowRoles('ADMISSION', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(reviewSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.admissionApplication.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Application not found.');
  const app = await prisma.admissionApplication.update({
    where: { id: req.params.id },
    data: { status: req.body.status, remarks: req.body.remarks, reviewedById: req.user.id, reviewedAt: new Date() },
    include: { program: { select: { name: true } }, reviewedBy: { select: { fullName: true } } },
  });
  await audit({ actorId: req.user.id, action: 'ADMISSION_APP_REVIEWED', entityType: 'admission_application', entityId: app.id });
  return ok(res, app);
}));

router.delete('/applications/:id', authenticate, allowRoles('ADMISSION', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.admissionApplication.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Application not found.');
  await prisma.admissionApplication.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'ADMISSION_APP_DELETED', entityType: 'admission_application', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

export default router;
