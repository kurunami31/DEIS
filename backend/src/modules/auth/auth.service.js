import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { signToken } from '../../lib/tokens.js';
import { audit } from '../../lib/audit.js';
import { UnauthorizedError, NotFoundError, ConflictError, UnprocessableError } from '../../lib/http.js';

/**
 * Step 1 of the portal-style onboarding: an examinee verifies a student number.
 * If no account exists yet, the student's 6-character activation code is
 * returned; the code is deterministic per student and stored only locally
 * (replaced by real OTP/SMS delivery in a production rollout).
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

export async function activate(studentNo, activationCode, password) {
  const student = await prisma.studentProfile.findUnique({
    where: { studentNo },
    include: { user: true },
  });
  if (!student) throw new NotFoundError('Student number not found.');

  if (student.activationCode !== activationCode) {
    throw new UnprocessableError('Activation code is incorrect.');
  }
  if (student.user) throw new ConflictError('Account already activated. Please login instead.');

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
    return created;
  });

  await audit({
    actorId: user.id,
    action: 'STUDENT_ACTIVATED',
    entityType: 'student',
    entityId: student.id,
  });

  return { token: signToken({ sub: user.id, role: user.role }), fullName: user.fullName, role: user.role };
}

export async function login(identifier, password) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { student: { studentNo: identifier.toUpperCase() } }],
    },
    include: { student: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid credentials. Please check your identifier and password.');
  }
  if (!user.isActive) throw new UnauthorizedError('This account has been deactivated.');

  await audit({ actorId: user.id, action: 'USER_LOGIN', entityType: 'user', entityId: user.id });

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: serializeUser(user),
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError('Current password is incorrect.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  await audit({ actorId: userId, action: 'PASSWORD_CHANGED', entityType: 'user', entityId: userId });
  return { ok: true };
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