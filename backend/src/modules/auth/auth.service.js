import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { signToken } from '../../lib/tokens.js';
import { audit } from '../../lib/audit.js';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  ForbiddenError,
} from '../../lib/http.js';
import {
  isLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  remainingLockSeconds,
  isCommonPassword,
} from '../../lib/security.js';

const PASSWORD_HISTORY_DEPTH = 3;

/**
 * Step 1 of the portal-style onboarding: a student verifies their student
 * number to learn whether an account exists and how to proceed.
 */
export async function verifyStudent(studentNo) {
  const student = await prisma.studentProfile.findUnique({
    where: { studentNo },
    include: { user: true, program: { include: { faculty: true } } },
  });

  if (!student) throw new NotFoundError('Student number not found. Please check and try again.');

  if (student.user) {
    return {
      studentNo: student.studentNo,
      fullName: `${student.firstName} ${student.lastName}`,
      programName: student.program.name,
      alreadyActivated: true,
    };
  }

  return {
    studentNo: student.studentNo,
    fullName: `${student.firstName} ${student.lastName}`,
    programName: student.program.name,
    alreadyActivated: false,
    activationCode: student.activationCode,
  };
}

export async function activate(studentNo, activationCode, password, { ip } = {}) {
  const student = await prisma.studentProfile.findUnique({
    where: { studentNo },
    include: { user: true },
  });
  if (!student) throw new NotFoundError('Student number not found.');

  if (student.activationCode !== activationCode) {
    recordFailedAttempt(studentNo, ip);
    throw new UnprocessableError('Activation code is incorrect.');
  }
  if (student.user) throw new ConflictError('Account already activated. Please login instead.');
  if (isLocked(studentNo, ip)) {
    throw new UnauthorizedError('Too many failed attempts. Account is locked temporarily.');
  }
  await assertPasswordUsable(password, null);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: `${student.studentNo.toLowerCase()}@students.dorsu.edu.ph`,
        passwordHash: await hashPassword(password),
        fullName: `${student.firstName} ${student.lastName}`,
        role: 'STUDENT',
        mustChangePassword: false,
      },
    });
    await tx.studentProfile.update({ where: { id: student.id }, data: { userId: created.id } });
    await tx.userPasswordHistory.create({
      data: { userId: created.id, passwordHash: created.passwordHash },
    });
    return created;
  });

  clearFailedAttempts(studentNo, ip);
  await audit({
    actorId: user.id,
    action: 'STUDENT_ACTIVATED',
    entityType: 'student',
    entityId: student.id,
  });

  return { token: signToken(user), fullName: user.fullName, role: user.role };
}

export async function login(identifier, password, { ip } = {}) {
  if (isLocked(identifier, ip)) {
    const seconds = remainingLockSeconds(identifier, ip);
    throw new UnauthorizedError(
      `Too many failed login attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { student: { studentNo: identifier.toUpperCase() } }],
    },
    include: { student: true },
  });

  const valid = user && (await verifyPassword(password, user.passwordHash));
  if (!user || !valid) {
    const { remaining } = recordFailedAttempt(identifier, ip);
    await audit({
      action: 'LOGIN_FAILED',
      entityType: 'user',
      entityId: user?.id ?? null,
      meta: { identifier: identifier.toLowerCase(), ip, remaining },
    });
    const message =
      remaining === 0
        ? 'Too many failed login attempts. Account is locked for 15 minutes.'
        : 'Invalid credentials. Please check your identifier and password.';
    throw new UnauthorizedError(message);
  }
  if (!user.isActive) throw new UnauthorizedError('This account has been deactivated.');

  clearFailedAttempts(identifier, ip);
  await audit({ actorId: user.id, action: 'USER_LOGIN', entityType: 'user', entityId: user.id });

  return {
    token: signToken(user),
    user: serializeUser(user),
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (user.role === 'ADMIN') {
    throw new ForbiddenError('The administrator account is system-managed and cannot change its password.');
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError('Current password is incorrect.');
  }
  await assertPasswordUsable(newPassword, user);

  // Rotating tokenVersion invalidates every previously issued session.
  const updated = await prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(newPassword);
    await tx.userPasswordHistory.create({ data: { userId, passwordHash } });
    const keep = await tx.userPasswordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_DEPTH,
      select: { id: true },
    });
    await tx.userPasswordHistory.deleteMany({
      where: { userId, id: { notIn: keep.map((h) => h.id) } },
    });
    return tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
  });

  await audit({ actorId: userId, action: 'PASSWORD_CHANGED', entityType: 'user', entityId: userId });
  return { ok: true, token: signToken(updated) };
}

async function assertPasswordUsable(plain, user) {
  if (isCommonPassword(plain)) {
    throw new UnprocessableError('That password is too common. Choose something more unique.');
  }
  if (!user) return;

  const history = await prisma.userPasswordHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: PASSWORD_HISTORY_DEPTH,
  });
  for (const entry of history) {
    if (await verifyPassword(plain, entry.passwordHash)) {
      throw new UnprocessableError('New password must differ from your recent passwords.');
    }
  }
}

export function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    student: user.student
      ? {
          studentNo: user.student.studentNo,
          yearLevel: user.student.yearLevel,
          programId: user.student.programId,
          campusId: user.student.campusId,
        }
      : null,
  };
}