import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { signToken, signChallengeToken, verifyChallengeToken, signResetToken, verifyResetToken } from '../../lib/tokens.js';
import { audit } from '../../lib/audit.js';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  ForbiddenError,
} from '../../lib/http.js';
import { CURRENT_DPA_VERSION, dpaConsentRequired } from '../../lib/dpa.js';
import {
  isLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  remainingLockSeconds,
  isCommonPassword,
} from '../../lib/security.js';
import {
  generateTotpSecret,
  otpauthUrl,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  stripRecoveryCode,
} from '../../lib/totp.js';

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

export async function activate(studentNo, activationCode, password, { ip, dpaVersion } = {}) {
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
  assertConsentVersion(dpaVersion);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: `${student.studentNo.toLowerCase()}@students.dorsu.edu.ph`,
        passwordHash: await hashPassword(password),
        fullName: `${student.firstName} ${student.lastName}`,
        role: 'STUDENT',
        mustChangePassword: false,
        dpaConsentAt: new Date(),
        dpaConsentVersion: CURRENT_DPA_VERSION,
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
  await audit({
    actorId: user.id,
    action: 'DPA_CONSENTED',
    entityType: 'user',
    entityId: user.id,
    meta: { version: CURRENT_DPA_VERSION, source: 'activation' },
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

  // Two-step login for accounts with TOTP enabled: the password check
  // succeeds but no session is minted until the 6-digit code is verified.
  if (user.totpEnabledAt) {
    return {
      totpRequired: true,
      challengeToken: signChallengeToken(user.id),
      user: serializeUser(user),
    };
  }

  return {
    token: signToken(user),
    user: serializeUser(user),
  };
}

export async function verifyTotpLogin(challengeToken, code, { ip } = {}) {
  let payload;
  try {
    payload = verifyChallengeToken(challengeToken);
  } catch {
    throw new UnauthorizedError('This login attempt has expired. Please sign in again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new NotFoundError('User not found.');
  if (!user.totpEnabledAt) throw new UnauthorizedError('Two-factor authentication is not enabled on this account.');
  if (!user.isActive) throw new UnauthorizedError('This account has been deactivated.');

  const valid = await verifySecondFactor(user, code);
  if (!valid) {
    const { remaining } = recordFailedAttempt(user.email, ip);
    await audit({
      action: 'TOTP_FAILED',
      entityType: 'user',
      entityId: user.id,
      meta: { ip, remaining },
    });
    const message =
      remaining === 0
        ? 'Too many failed attempts. Account is locked for 15 minutes.'
        : 'That code is invalid or has expired.';
    throw new UnauthorizedError(message);
  }

  clearFailedAttempts(user.email, ip);
  await audit({ actorId: user.id, action: 'TOTP_VERIFIED', entityType: 'user', entityId: user.id });

  return {
    token: signToken(user),
    user: serializeUser(user),
  };
}

async function verifySecondFactor(user, code) {
  if (user.totpSecret && verifyTotp(user.totpSecret, code)) return true;
  const hashed = safeJsonParse(user.totpRecoveryCodes);
  if (verifyRecoveryCode(hashed, code)) {
    const remaining = stripRecoveryCode(hashed, code);
    await prisma.user.update({
      where: { id: user.id },
      data: { totpRecoveryCodes: JSON.stringify(remaining) },
    });
    await audit({
      actorId: user.id,
      action: 'RECOVERY_CODE_USED',
      entityType: 'user',
      entityId: user.id,
      meta: { remaining: remaining.length },
    });
    return true;
  }
  return false;
}

/**
 * Begins TOTP enrollment: generates a fresh secret. Nothing is enabled until
 * confirmTotp verifies a live code, so abandoning mid-flow is harmless.
 */
export async function enrollTotp(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (user.totpEnabledAt) throw new ConflictError('Two-factor authentication is already enabled.');

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
  await audit({ actorId: userId, action: 'TOTP_ENROLL_STARTED', entityType: 'user', entityId: userId });

  return { secret, otpauthUrl: otpauthUrl(secret, user.email) };
}

export async function confirmTotp(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (user.totpEnabledAt) throw new ConflictError('Two-factor authentication is already enabled.');
  if (!user.totpSecret || !verifyTotp(user.totpSecret, code)) {
    throw new UnprocessableError('The verification code is invalid. Please try again.');
  }

  const recoveryCodes = generateRecoveryCodes(8);
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabledAt: new Date(),
      totpRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
    },
  });
  await audit({ actorId: userId, action: 'TOTP_ENABLED', entityType: 'user', entityId: userId });

  return { recoveryCodes };
}

export async function disableTotp(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (!user.totpEnabledAt) throw new ConflictError('Two-factor authentication is not enabled.');

  const valid = await verifySecondFactor(user, code);
  if (!valid) throw new UnprocessableError('The code is invalid. Two-factor authentication was not disabled.');

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabledAt: null, totpRecoveryCodes: null },
  });
  await audit({ actorId: userId, action: 'TOTP_DISABLED', entityType: 'user', entityId: userId });
  return { ok: true };
}

function safeJsonParse(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Fixed question bank so answers stay comparable and users can't invent
// unverifiable prompts. IDs are stable keys; labels are the display text.
export const SECURITY_QUESTIONS = [
  { id: 'mother_maiden', label: "What is your mother's maiden name?" },
  { id: 'birth_city', label: 'In what city were you born?' },
  { id: 'first_school', label: 'What is the name of your first school?' },
  { id: 'pet_name', label: 'What was the name of your first pet?' },
  { id: 'favorite_teacher', label: 'What was the name of your favorite teacher in grade school?' },
];

export const REQUIRED_SECURITY_QUESTIONS = 3;

function hashAnswer(answer) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${salt}:${answer.trim().toLowerCase()}`).digest('hex');
  return { salt, hash };
}

function answerMatches(stored, answer) {
  if (!stored) return false;
  const probe = crypto.createHash('sha256').update(`${stored.salt}:${answer.trim().toLowerCase()}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(stored.hash), Buffer.from(probe));
}

/** Sets (or replaces) the user's security questions used for recovery. */
export async function setSecurityQuestions(userId, answers) {
  if (!Array.isArray(answers) || answers.length < REQUIRED_SECURITY_QUESTIONS) {
    throw new UnprocessableError(`Please provide at least ${REQUIRED_SECURITY_QUESTIONS} security questions.`);
  }
  const mapped = [];
  const seen = new Set();
  for (const item of answers) {
    const definition = SECURITY_QUESTIONS.find((q) => q.id === item.questionId);
    if (!definition || seen.has(item.questionId)) {
      throw new UnprocessableError('Each selected security question must be unique.');
    }
    if (typeof item.answer !== 'string' || item.answer.trim().length < 2) {
      throw new UnprocessableError('Security answers must be at least 2 characters.');
    }
    seen.add(item.questionId);
    mapped.push({ questionId: definition.id, questionLabel: definition.label, ...hashAnswer(item.answer) });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordQuestions: JSON.stringify(mapped) },
  });
  await audit({ actorId: userId, action: 'SECURITY_QUESTIONS_SET', entityType: 'user', entityId: userId });
  return {
    ok: true,
    questions: mapped.map((q) => ({ questionId: q.questionId, questionLabel: q.questionLabel })),
  };
}

/**
 * Step 1 of recovery: verifies identity is enrolled for questions and hands
 * back a short-lived reset token plus the questions that must be answered.
 * Errors are deliberately vague so the endpoint cannot enumerate accounts.
 */
export async function beginPasswordReset(identifier) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { student: { studentNo: identifier.toUpperCase() } }] },
  });
  if (!user || !user.isActive || !user.passwordQuestions) {
    throw new UnauthorizedError('Account not found or security questions are not set up.');
  }
  const stored = safeJsonParse(user.passwordQuestions).map((q) => ({
    questionId: q.questionId,
    questionLabel: q.questionLabel,
  }));
  // Rotating nonce makes every issued reset token single-use.
  const nonce = crypto.randomBytes(16).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { resetNonce: nonce } });
  return { resetToken: signResetToken(user.id, nonce), questions: stored };
}

/** Step 2 of recovery: answers the questions and sets a new password. */
export async function finishPasswordReset(resetToken, answers, newPassword) {
  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new UnauthorizedError('This reset attempt has expired. Please start over.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { student: true } });
  if (!user) throw new NotFoundError('User not found.');
  if (user.role === 'ADMIN') {
    throw new ForbiddenError('The administrator account cannot be recovered through the portal.');
  }
  if (!user.passwordQuestions) throw new UnauthorizedError('Security questions are not set up on this account.');
  if (!user.resetNonce || payload.nce !== user.resetNonce) {
    throw new UnauthorizedError('This reset link has already been used. Please start over.');
  }

  const stored = safeJsonParse(user.passwordQuestions);
  const byId = new Map(stored.map((q) => [q.questionId, q]));
  let matched = 0;
  for (const answer of answers) {
    const record = byId.get(answer?.questionId);
    if (record && answerMatches(record, answer?.answer)) matched += 1;
  }
  if (matched < Math.min(REQUIRED_SECURITY_QUESTIONS, stored.length)) {
    throw new UnauthorizedError('The security answers are incorrect.');
  }

  await assertPasswordUsable(newPassword, user);
  const updated = await prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(newPassword);
    await tx.userPasswordHistory.create({ data: { userId: user.id, passwordHash } });
    const keep = await tx.userPasswordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_DEPTH,
      select: { id: true },
    });
    await tx.userPasswordHistory.deleteMany({
      where: { userId: user.id, id: { notIn: keep.map((h) => h.id) } },
    });
    return tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 }, // revoke every existing session
        dpaConsentAt: new Date(),
        dpaConsentVersion: CURRENT_DPA_VERSION,
        resetNonce: null,
      },
    });
  });

  await audit({
    actorId: user.id,
    action: 'PASSWORD_RESET',
    entityType: 'user',
    entityId: user.id,
    meta: { method: 'security-questions' },
  });
  return { ok: true, token: signToken(updated) };
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

export async function recordConsent(userId, version) {
  if (version !== CURRENT_DPA_VERSION) {
    throw new UnprocessableError('Please review and accept the current Data Privacy notice before proceeding.');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { dpaConsentAt: new Date(), dpaConsentVersion: CURRENT_DPA_VERSION },
  });
  await audit({
    actorId: userId,
    action: 'DPA_CONSENTED',
    entityType: 'user',
    entityId: userId,
    meta: { version: CURRENT_DPA_VERSION, source: 'portal' },
  });
  return { dpaConsentAt: user.dpaConsentAt, dpaConsentVersion: user.dpaConsentVersion };
}

/**
 * First-login password setup for staff accounts created by an administrator.
 * Unlike changePassword it does not require the current password (the user
 * cannot have known it yet) and applies the same strength/history rules.
 */
export async function setInitialPassword(userId, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found.');
  if (!user.mustChangePassword) {
    throw new UnprocessableError('This account already has a password set.');
  }
  await assertPasswordUsable(newPassword, user);

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

  await audit({ actorId: userId, action: 'INITIAL_PASSWORD_SET', entityType: 'user', entityId: userId });
  return { ok: true, token: signToken(updated) };
}

function assertConsentVersion(dpaVersion) {
  if (dpaVersion !== CURRENT_DPA_VERSION) {
    throw new UnprocessableError('Please review and accept the current Data Privacy notice before proceeding.');
  }
}

export function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    totpEnabled: Boolean(user.totpEnabledAt),
    dpaConsentAt: user.dpaConsentAt,
    dpaConsentVersion: user.dpaConsentVersion ?? 0,
    dpaConsentRequired: dpaConsentRequired(user),
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