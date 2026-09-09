import { prisma } from '../../lib/prisma.js';
import { generateOtp, hashOtp, verifyOtp, otpExpiresAt, isOtpExpired } from '../../lib/otp.js';
import { sendMail, otpEmailTemplate } from '../../lib/mailer.js';
import { NotFoundError, UnauthorizedError, TooManyRequestsError } from '../../lib/http.js';
import { audit } from '../../lib/audit.js';

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

async function findUser(identifier) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { student: { studentNo: identifier.toUpperCase() } },
      ],
    },
    include: { student: true },
  });
}

function recipientEmail(user) {
  return user.email;
}

function recipientName(user) {
  if (user.student) return `${user.student.firstName} ${user.student.lastName}`;
  return user.fullName;
}

/**
 * Send a 6-digit OTP to the user's email for the given purpose.
 */
export async function sendOtp(identifier, purpose, { ip } = {}) {
  const user = await findUser(identifier);
  if (!user) throw new NotFoundError('Account not found.');
  if (!user.isActive) throw new UnauthorizedError('Account is deactivated.');

  // Check cooldown — prevent spam
  const recentOtp = await prisma.emailOtp.findFirst({
    where: {
      userId: user.id,
      purpose,
      createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recentOtp) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recentOtp.createdAt.getTime())) / 1000);
    throw new TooManyRequestsError(`Please wait ${waitSec} seconds before requesting a new code.`);
  }

  // Invalidate any existing unused OTPs for this user+purpose
  await prisma.emailOtp.updateMany({
    where: { userId: user.id, purpose, used: false },
    data: { used: true },
  });

  // Generate and store hashed OTP
  const code = generateOtp();
  const hashedCode = await hashOtp(code);
  const expiresAt = otpExpiresAt();

  await prisma.emailOtp.create({
    data: {
      userId: user.id,
      code: hashedCode,
      purpose,
      expiresAt,
    },
  });

  // Send email
  const email = recipientEmail(user);
  const name = recipientName(user);
  await sendMail({
    to: email,
    subject: `DEIS Verification Code — ${purpose.replace('_', ' ')}`,
    html: otpEmailTemplate({ code, purpose, recipientName: name }),
  });

  await audit({
    actorId: user.id,
    action: 'OTP_SENT',
    entityType: 'email_otp',
    entityId: user.id,
    meta: { purpose, email, ip },
  });

  return {
    ok: true,
    message: `Verification code sent to ${email}`,
    expiresIn: 600, // 10 minutes in seconds
  };
}

/**
 * Verify a 6-digit OTP. Returns a reset token for PASSWORD_RESET purpose.
 */
export async function verifyOtpCode(identifier, code, purpose, { ip } = {}) {
  const user = await findUser(identifier);
  if (!user) throw new NotFoundError('Account not found.');

  const otpRecord = await prisma.emailOtp.findFirst({
    where: { userId: user.id, purpose, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    throw new UnauthorizedError('No active verification code found. Please request a new one.');
  }

  if (isOtpExpired(otpRecord.expiresAt)) {
    throw new UnauthorizedError('This code has expired. Please request a new one.');
  }

  const valid = await verifyOtp(otpRecord.code, code);
  if (!valid) {
    throw new UnauthorizedError('Invalid verification code.');
  }

  // Mark as used
  await prisma.emailOtp.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  await audit({
    actorId: user.id,
    action: 'OTP_VERIFIED',
    entityType: 'email_otp',
    entityId: user.id,
    meta: { purpose, ip },
  });

  // For PASSWORD_RESET, return a reset token
  if (purpose === 'PASSWORD_RESET') {
    const crypto = await import('node:crypto');
    const { signResetToken } = await import('../../lib/tokens.js');
    const nonce = crypto.randomBytes(16).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { resetNonce: nonce } });
    return { ok: true, resetToken: signResetToken(user.id, nonce) };
  }

  return { ok: true, message: 'Verification successful.' };
}
