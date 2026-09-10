import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const SERVICE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const OFFENSE_TYPES = ['MINOR', 'MODERATE', 'MAJOR'];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get(
  '/dashboard',
  authenticate,
  allowRoles('OSA', 'ADMIN'),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOrgs, activeOrgs, pendingServices, totalServices, openDisciplinary] = await Promise.all([
      prisma.studentOrg.count(),
      prisma.studentOrg.count({ where: { isActive: true } }),
      prisma.communityService.count({ where: { status: 'PENDING' } }),
      prisma.communityService.count(),
      prisma.disciplinaryRecord.count({ where: { isResolved: false } }),
    ]);

    return ok(res, { totalOrgs, activeOrgs, pendingServices, totalServices, openDisciplinary });
  }),
);

// ---------------------------------------------------------------------------
// Student Organizations
// ---------------------------------------------------------------------------
const orgCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional(),
  adviser: z.string().max(100).optional(),
});
const orgUpdateSchema = orgCreateSchema.partial();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

router.get('/orgs', authenticate, allowRoles('OSA', 'ADMIN', 'REGISTRAR'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [orgs, total] = await Promise.all([
    prisma.studentOrg.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.studentOrg.count(),
  ]);
  return ok(res, { orgs, total, page, limit });
}));

router.post('/orgs', authenticate, allowRoles('OSA', 'ADMIN'), validate(orgCreateSchema), asyncHandler(async (req, res) => {
  const org = await prisma.studentOrg.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'STUDENT_ORG_CREATED', entityType: 'student_org', entityId: org.id });
  return created(res, org);
}));

router.patch('/orgs/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(orgUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.studentOrg.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Organization not found.');
  const org = await prisma.studentOrg.update({ where: { id: req.params.id }, data: req.body });
  await audit({ actorId: req.user.id, action: 'STUDENT_ORG_UPDATED', entityType: 'student_org', entityId: org.id });
  return ok(res, org);
}));

router.delete('/orgs/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.studentOrg.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Organization not found.');
  await prisma.studentOrg.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'STUDENT_ORG_DELETED', entityType: 'student_org', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// Org members
router.post('/orgs/:id/members', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(z.object({ studentId: z.string().uuid(), position: z.string().max(50).optional() })), asyncHandler(async (req, res) => {
  const org = await prisma.studentOrg.findUnique({ where: { id: req.params.id } });
  if (!org) throw new NotFoundError('Organization not found.');
  const member = await prisma.studentOrgMember.upsert({
    where: { studentId_orgId: { studentId: req.body.studentId, orgId: req.params.id } },
    update: { position: req.body.position },
    create: { studentId: req.body.studentId, orgId: req.params.id, position: req.body.position },
  });
  return created(res, member);
}));

router.delete('/orgs/:orgId/members/:studentId', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ orgId: z.string().uuid(), studentId: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  await prisma.studentOrgMember.deleteMany({ where: { studentId: req.params.studentId, orgId: req.params.orgId } });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Community / Extension Services
// ---------------------------------------------------------------------------
const serviceCreateSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  hours: z.number().int().min(0).default(0),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
});
const serviceUpdateSchema = z.object({
  status: z.enum(SERVICE_STATUSES).optional(),
  verifiedBy: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

router.get('/services', authenticate, allowRoles('OSA', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [services, total] = await Promise.all([
    prisma.communityService.findMany({
      include: { student: { select: { id: true, studentNo: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.communityService.count(),
  ]);
  return ok(res, { services, total, page, limit });
}));

router.post('/services', authenticate, allowRoles('OSA', 'ADMIN'), validate(serviceCreateSchema), asyncHandler(async (req, res) => {
  const svc = await prisma.communityService.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'COMMUNITY_SERVICE_CREATED', entityType: 'community_service', entityId: svc.id });
  return created(res, svc);
}));

router.patch('/services/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(serviceUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.communityService.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Service not found.');
  const svc = await prisma.communityService.update({ where: { id: req.params.id }, data: req.body });
  await audit({ actorId: req.user.id, action: 'COMMUNITY_SERVICE_UPDATED', entityType: 'community_service', entityId: svc.id });
  return ok(res, svc);
}));

router.delete('/services/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.communityService.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Service not found.');
  await prisma.communityService.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'COMMUNITY_SERVICE_DELETED', entityType: 'community_service', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Disciplinary Records
// ---------------------------------------------------------------------------
const disciplinaryCreateSchema = z.object({
  studentId: z.string().uuid(),
  offense: z.enum(OFFENSE_TYPES),
  description: z.string().trim().min(5).max(1000),
  action: z.string().trim().min(2).max(200),
  dateIssued: z.coerce.date(),
  issuedBy: z.string().max(100).optional(),
});
const disciplinaryUpdateSchema = z.object({
  isResolved: z.boolean().optional(),
  resolvedAt: z.coerce.date().optional(),
  action: z.string().trim().max(200).optional(),
  notes: z.string().max(500).optional(),
});

router.get('/disciplinary', authenticate, allowRoles('OSA', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [records, total] = await Promise.all([
    prisma.disciplinaryRecord.findMany({
      include: { student: { select: { id: true, studentNo: true, firstName: true, lastName: true } } },
      orderBy: { dateIssued: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.disciplinaryRecord.count(),
  ]);
  return ok(res, { records, total, page, limit });
}));

router.post('/disciplinary', authenticate, allowRoles('OSA', 'ADMIN'), validate(disciplinaryCreateSchema), asyncHandler(async (req, res) => {
  const rec = await prisma.disciplinaryRecord.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'DISCIPLINARY_RECORD_CREATED', entityType: 'disciplinary_record', entityId: rec.id });
  return created(res, rec);
}));

router.patch('/disciplinary/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(disciplinaryUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.disciplinaryRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Record not found.');
  const rec = await prisma.disciplinaryRecord.update({ where: { id: req.params.id }, data: req.body });
  await audit({ actorId: req.user.id, action: 'DISCIPLINARY_RECORD_UPDATED', entityType: 'disciplinary_record', entityId: rec.id });
  return ok(res, rec);
}));

router.delete('/disciplinary/:id', authenticate, allowRoles('OSA', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.disciplinaryRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Record not found.');
  await prisma.disciplinaryRecord.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'DISCIPLINARY_RECORD_DELETED', entityType: 'disciplinary_record', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

export default router;
