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

export function forgotPasswordEmailTemplate({ code, recipientName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">DOrSU Enrollment Information System</h1>
            <p style="margin:6px 0 0;color:#a0c4e8;font-size:13px;">Davao Oriental State University</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 20px;">
            <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Forgot Your Password?</h2>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              Hello${recipientName ? ' <strong>' + recipientName + '</strong>' : ''},
            </p>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              We received a request to reset the password for your DEIS account.
              Use the verification code below to proceed:
            </p>
          </td>
        </tr>

        <!-- OTP Code -->
        <tr>
          <td style="padding:0 40px;">
            <div style="background:#f0f7ff;border:2px dashed #1e3a5f;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;">
              <p style="margin:0 0 8px;color:#6c757d;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
              <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1e3a5f;font-family:'Courier New',monospace;">${code}</span>
            </div>
          </td>
        </tr>

        <!-- Instructions -->
        <tr>
          <td style="padding:20px 40px 30px;">
            <p style="margin:0 0 12px;color:#4a5568;font-size:14px;line-height:1.6;">
              Enter this code on the password reset page. It will expire in <strong>10 minutes</strong>.
            </p>
            <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:16px;">
              <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                <strong>Security tip:</strong> Never share this code with anyone. DOrSU staff will never ask for your verification code.
              </p>
            </div>
            <p style="margin:0;color:#6c757d;font-size:13px;line-height:1.5;">
              If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Davao Oriental State University · DOrSU DEIS</p>
            <p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated message. Please do not reply.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailConfirmationTemplate({ code, recipientName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">DOrSU Enrollment Information System</h1>
            <p style="margin:6px 0 0;color:#a0c4e8;font-size:13px;">Davao Oriental State University</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 20px;">
            <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Confirm Your Email Address</h2>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              Hello${recipientName ? ' <strong>' + recipientName + '</strong>' : ''},
            </p>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              Welcome to DOrSU DEIS! To complete your registration and activate your account, please verify your email address using the code below:
            </p>
          </td>
        </tr>

        <!-- OTP Code -->
        <tr>
          <td style="padding:0 40px;">
            <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;">
              <p style="margin:0 0 8px;color:#6c757d;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Email Verification Code</p>
              <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#16a34a;font-family:'Courier New',monospace;">${code}</span>
            </div>
          </td>
        </tr>

        <!-- Instructions -->
        <tr>
          <td style="padding:20px 40px 30px;">
            <p style="margin:0 0 12px;color:#4a5568;font-size:14px;line-height:1.6;">
              Enter this code on the verification page to confirm your email. This code will expire in <strong>10 minutes</strong>.
            </p>
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:16px;">
              <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.5;">
                <strong>What happens next?</strong> Once verified, you can log in to your account and start using DOrSU DEIS for enrollment, grades, and other student services.
              </p>
            </div>
            <p style="margin:0;color:#6c757d;font-size:13px;line-height:1.5;">
              If you did not create an account with DOrSU DEIS, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Davao Oriental State University · DOrSU DEIS</p>
            <p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated message. Please do not reply.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function activationEmailTemplate({ code, recipientName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">DOrSU Enrollment Information System</h1>
            <p style="margin:6px 0 0;color:#a0c4e8;font-size:13px;">Davao Oriental State University</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 20px;">
            <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Activate Your Account</h2>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              Hello${recipientName ? ' <strong>' + recipientName + '</strong>' : ''},
            </p>
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">
              Your DOrSU DEIS account is ready! Use the code below to activate your account and set your password:
            </p>
          </td>
        </tr>

        <!-- OTP Code -->
        <tr>
          <td style="padding:0 40px;">
            <div style="background:#faf5ff;border:2px dashed #9333ea;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;">
              <p style="margin:0 0 8px;color:#6c757d;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Activation Code</p>
              <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#9333ea;font-family:'Courier New',monospace;">${code}</span>
            </div>
          </td>
        </tr>

        <!-- Instructions -->
        <tr>
          <td style="padding:20px 40px 30px;">
            <p style="margin:0 0 12px;color:#4a5568;font-size:14px;line-height:1.6;">
              Enter this code on the activation page to set up your login credentials. This code will expire in <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:16px;">
              <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
                <strong>Keep this code private.</strong> Do not share it with anyone, including university staff.
              </p>
            </div>
            <p style="margin:0;color:#6c757d;font-size:13px;line-height:1.5;">
              If you did not request an account, please contact the Registrar's Office.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Davao Oriental State University · DOrSU DEIS</p>
            <p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated message. Please do not reply.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function otpEmailTemplate({ code, purpose, recipientName }) {
  if (purpose === 'PASSWORD_RESET') return forgotPasswordEmailTemplate({ code, recipientName });
  if (purpose === 'EMAIL_CONFIRM') return emailConfirmationTemplate({ code, recipientName });
  if (purpose === 'ACTIVATION') return activationEmailTemplate({ code, recipientName });
  return forgotPasswordEmailTemplate({ code, recipientName });
}
