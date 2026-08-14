import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { hashPassword, generateRandomPassword } from '../../lib/passwords.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../../lib/http.js';
import { loadPolicy, invalidatePolicyCache, POLICY_DEFAULTS } from '../enrollments/enrollments.rules.js';

const router = Router();

const STAFF_ROLES = ['FACULTY', 'REGISTRAR', 'ADMIN', 'ACCOUNTING', 'ADMISSION', 'OSA', 'OHS', 'CASHIERING', 'OSCD', 'FAASG'];

const userCreateSchema = z
  .object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    role: z.enum(STAFF_ROLES),
  })
  .superRefine((data, ctx) => {
    // Staff accounts use their school email so staff identity is verifiable.
    if (data.role !== 'ADMIN' && !data.email.toLowerCase().endsWith('@dorsu.edu.ph')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Staff accounts must use their school email (name@dorsu.edu.ph).',
      });
    }
  });

router.get(
  '/users',
  authenticate,
  allowRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { not: 'STUDENT' } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, users);
  }),
);

router.post(
  '/users',
  authenticate,
  allowRoles('ADMIN'),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    if (req.body.role === 'ADMIN') {
      const existingAdmin = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (existingAdmin > 0) {
        throw new ConflictError('The system already has an administrator account; it cannot be duplicated.');
      }
    }

    // Passwords are always generated server-side so no plaintext is ever
    // transmitted; the temporary password is returned once for hand-over.
    const temporaryPassword = generateRandomPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await prisma.user.create({
      data: {
        fullName: req.body.fullName,
        email: req.body.email.toLowerCase(),
        role: req.body.role,
        passwordHash,
        mustChangePassword: true,
        passwordHistory: { create: { passwordHash } },
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
    await audit({ actorId: req.user.id, action: 'USER_CREATED', entityType: 'user', entityId: user.id });
    return created(res, { user, temporaryPassword });
  }),
);

router.patch(
  '/users/:id/status',
  authenticate,
  allowRoles('ADMIN'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  validate(z.object({ isActive: z.boolean() })),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new NotFoundError('User not found.');
    if (target.id === req.user.id) {
      return res.status(422).json({ error: { code: 'SELF_DEACTIVATE', message: 'You cannot deactivate your own account.' } });
    }
    if (target.role === 'ADMIN') {
      throw new UnprocessableError('The administrator account is system-managed and cannot be deactivated.');
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      select: { id: true, fullName: true, isActive: true },
    });
    return ok(res, user);
  }),
);

router.get(
  '/audit',
  authenticate,
  allowRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const logs = await prisma.activityRecord.findMany({
      include: { actor: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(res, logs);
  }),
);

// Enrollment evaluator configuration (W3): ADMIN tunes the rules the evaluator
// enforces. Every key maps to a POLICY_DEFAULTS entry; unknowns are rejected.
router.get(
  '/enrollment-policy',
  authenticate,
  allowRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const policy = await loadPolicy();
    return ok(res, { policy, defaults: POLICY_DEFAULTS });
  }),
);

router.put(
  '/enrollment-policy',
  authenticate,
  allowRoles('ADMIN'),
  validate(z.array(z.object({ key: z.string().min(1).max(64), value: z.string().min(1).max(128) })).max(20)),
  asyncHandler(async (req, res) => {
    const allowed = new Set(Object.keys(POLICY_DEFAULTS));
    const entries = req.body.filter((e) => allowed.has(e.key));
    await prisma.$transaction(
      entries.map((e) =>
        prisma.enrollmentPolicy.upsert({
          where: { key: e.key },
          create: { key: e.key, value: e.value },
          update: { value: e.value },
        }),
      ),
    );
    invalidatePolicyCache();
    await audit({
      actorId: req.user.id,
      action: 'ENROLLMENT_POLICY_UPDATED',
      entityType: 'system',
      entityId: 'enrollment-policy',
      meta: { keys: entries.map((e) => e.key) },
    });
    return ok(res, { policy: await loadPolicy() });
  }),
);

export default router;