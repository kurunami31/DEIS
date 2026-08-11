import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const activitySchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  location: z.string().trim().max(100).optional(),
  type: z.enum(['ACADEMIC', 'ADMINISTRATIVE', 'CULTURAL', 'SPORTS', 'OTHER']).default('ACADEMIC'),
  audience: z.enum(['ALL', 'STUDENTS', 'FACULTY', 'ADMIN']).default('ALL'),
});

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  audience: z.string().optional(),
  type: z.string().optional(),
});

function visibleAudiences(userRole) {
  const actor = userRole === 'ADMIN' ? 'ADMIN' : userRole;
  return { OR: [{ audience: 'ALL' }, { audience: actor }] };
}

router.get(
  '/',
  authenticate,
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.validated.query;
    const items = await prisma.universityActivity.findMany({
      where: {
        ...visibleAudiences(req.user.role),
        ...(req.validated.query.type ? { type: req.validated.query.type } : {}),
        ...(from ? { startsAt: { gte: from } } : {}),
        ...(to ? { startsAt: { lte: to } } : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
    return ok(res, items);
  }),
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'REGISTRAR'),
  validate(activitySchema),
  asyncHandler(async (req, res) => {
    const activity = await prisma.universityActivity.create({
      data: { ...req.body, createdById: req.user.id },
    });
    await audit({ actorId: req.user.id, action: 'CALENDAR_ACTIVITY_CREATED', entityType: 'university-activity', entityId: activity.id });
    return created(res, activity);
  }),
);

router.patch(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'REGISTRAR'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(activitySchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.universityActivity.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Activity not found.');
    const activity = await prisma.universityActivity.update({ where: { id: req.params.id }, data: req.body });
    await audit({ actorId: req.user.id, action: 'CALENDAR_ACTIVITY_UPDATED', entityType: 'university-activity', entityId: activity.id });
    return ok(res, activity);
  }),
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'REGISTRAR'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    await prisma.universityActivity.delete({ where: { id: req.params.id } }).catch(() => {
      throw new NotFoundError('Activity not found.');
    });
    await audit({ actorId: req.user.id, action: 'CALENDAR_ACTIVITY_DELETED', entityType: 'university-activity', entityId: req.params.id });
    return ok(res, { ok: true });
  }),
);

export default router;