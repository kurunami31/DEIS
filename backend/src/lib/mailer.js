import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export async function sendMail({ to, subject, html, text }) {
  if (!config.smtpHost) {
    console.warn('[mailer] SMTP not configured, skipping email to', to);
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: config.smtpFrom || `"DEIS" <${config.smtpUser}>`,
    to,
    subject,
    html,
    text: text || subject,
  });

  console.log('[mailer] sent', info.messageId, 'to', to);
  return { messageId: info.messageId };
}

export function otpEmailTemplate({ code, purpose, recipientName }) {
  const purposeLabel =
    purpose === 'ACTIVATION' ? 'Account Activation' :
    purpose === 'PASSWORD_RESET' ? 'Password Reset' :
    'Verification';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">DEIS — DOrSU Enrollment Information System</h1>
  </div>
  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
    <h2 style="color: #1e3a5f; margin-top: 0;">${purposeLabel}</h2>
    <p>Hello${recipientName ? ' ' + recipientName : ''},</p>
    <p>Your one-time verification code is:</p>
    <div style="background: white; border: 2px dashed #1e3a5f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
    </div>
    <p style="color: #6c757d; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="color: #6c757d; font-size: 14px;">If you did not request this, please ignore this email or contact the Registrar's Office.</p>
  </div>
  <div style="background: #e9ecef; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d;">
    Davao Oriental State University · DOrSU Enrollment Information System
  </div>
</body>
</html>`;
}
