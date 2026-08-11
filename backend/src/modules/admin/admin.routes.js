import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { hashPassword, generateRandomPassword } from '../../lib/passwords.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../../lib/http.js';

const router = Router();

const userCreateSchema = z
  .object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    role: z.enum(['FACULTY', 'REGISTRAR', 'ADMIN']),
  })
  .superRefine((data, ctx) => {
    // Faculty accounts use their school email so staff identity is verifiable.
    if (data.role === 'FACULTY' && !data.email.toLowerCase().endsWith('@dorsu.edu.ph')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Faculty accounts must use their school email (name@dorsu.edu.ph).',
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
  allowRoles('ADMIN', 'REGISTRAR'),
  asyncHandler(async (req, res) => {
    const logs = await prisma.activityRecord.findMany({
      include: { actor: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(res, logs);
  }),
);

export default router;