/**
 * Transactional email delivery.
 *
 * The transport is picked from the environment, in this order:
 *
 * 1. `EMAIL_TRANSPORT=console` prints every email (including its action link) to
 *    the server console, in any environment. For local testing only; never set it
 *    on a real deployment.
 * 2. Resend (`RESEND_API_KEY` + `EMAIL_FROM`), which needs a verified domain.
 * 3. SMTP via Nodemailer (`SMTP_HOST` + `SMTP_USER` + `SMTP_PASS`), e.g. Gmail
 *    with an app password. `EMAIL_FROM` defaults to `MedAssist AI <SMTP_USER>`.
 * 4. Nothing configured: printed to the console in development; in production,
 *    sending fails loudly instead of silently dropping verification and
 *    password-reset emails.
 */

import nodemailer, { type Transporter } from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailTransport = 'console' | 'resend' | 'smtp' | 'none';

const APP_NAME = 'MedAssist AI';

function resolveTransport(): EmailTransport {
  const env = process.env;
  if (env.EMAIL_TRANSPORT === 'console') return 'console';
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return 'resend';
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
  return 'none';
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transport = resolveTransport();

  switch (transport) {
    case 'resend':
      return sendWithResend(payload);
    case 'smtp':
      return sendWithSmtp(payload);
    case 'none':
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Email provider is not configured. Set RESEND_API_KEY + EMAIL_FROM, or SMTP_HOST + SMTP_USER + SMTP_PASS (or EMAIL_TRANSPORT=console for local testing).',
        );
      }
      return logToConsole(payload);
    case 'console':
      return logToConsole(payload);
  }
}

function logToConsole({ to, subject, text }: EmailPayload) {
  console.info(`\n[email:console] To: ${to}\n[email:console] Subject: ${subject}\n${text}\n`);
}

async function sendWithResend({ to, subject, html, text }: EmailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send email via Resend (${res.status}): ${body}`);
  }
}

// Reused across calls within the same server instance / warm serverless invocation.
let smtpTransporter: Transporter | undefined;

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter;

  const port = Number(process.env.SMTP_PORT || 465);
  // Port 465 uses implicit TLS. Other ports must upgrade with STARTTLS, unless
  // SMTP_SECURE="false" is set explicitly (local mail catchers such as Mailpit).
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const allowPlaintext = process.env.SMTP_SECURE === 'false';

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure && !allowPlaintext,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return smtpTransporter;
}

async function sendWithSmtp({ to, subject, html, text }: EmailPayload): Promise<void> {
  const from = process.env.EMAIL_FROM || `${APP_NAME} <${process.env.SMTP_USER}>`;

  try {
    await getSmtpTransporter().sendMail({ from, to, subject, html, text });
  } catch (error) {
    // Never include credentials; nodemailer errors carry only the SMTP response.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send email via SMTP: ${detail}`);
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function layout({ heading, body, ctaLabel, ctaUrl, footnote }: { heading: string; body: string; ctaLabel: string; ctaUrl: string; footnote: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#102033;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dbe6ef;border-radius:16px;padding:32px;">
            <tr><td style="font-size:15px;font-weight:800;letter-spacing:-0.01em;color:#0f172a;padding-bottom:24px;">MED <span style="color:#2563eb;font-weight:500;">ASSIST</span> AI</td></tr>
            <tr><td style="font-size:22px;font-weight:800;padding-bottom:12px;">${heading}</td></tr>
            <tr><td style="font-size:14px;line-height:1.6;color:#526173;padding-bottom:24px;">${body}</td></tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">${ctaLabel}</a>
              </td>
            </tr>
            <tr><td style="font-size:12px;line-height:1.6;color:#7a8899;border-top:1px solid #eef2f6;padding-top:16px;">${footnote}<br /><br />If the button doesn't work, copy this link into your browser:<br /><span style="word-break:break-all;color:#2563eb;">${ctaUrl}</span></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail({ name, url }: { name: string; url: string }): Omit<EmailPayload, 'to'> {
  const safeName = escapeHtml(name);
  return {
    subject: `Verify your email for ${APP_NAME}`,
    html: layout({
      heading: 'Confirm your email address',
      body: `Hi ${safeName}, thanks for joining ${APP_NAME}. Please confirm your email address to activate your account and access your health portal.`,
      ctaLabel: 'Verify email',
      ctaUrl: url,
      footnote: "This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.",
    }),
    text: `Hi ${name},\n\nConfirm your email address for ${APP_NAME}:\n${url}\n\nThis link expires in 1 hour.`,
  };
}

export function resetPasswordEmail({ name, url }: { name: string; url: string }): Omit<EmailPayload, 'to'> {
  const safeName = escapeHtml(name);
  return {
    subject: `Reset your ${APP_NAME} password`,
    html: layout({
      heading: 'Reset your password',
      body: `Hi ${safeName}, we received a request to reset the password for your ${APP_NAME} account. Click below to choose a new one.`,
      ctaLabel: 'Choose a new password',
      ctaUrl: url,
      footnote:
        "This link expires in 1 hour and can only be used once. If you didn't request a reset, ignore this email — your password won't change.",
    }),
    text: `Hi ${name},\n\nReset your ${APP_NAME} password:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}

export function staffInviteEmail({ name, url, role }: { name: string; url: string; role: string }): Omit<EmailPayload, 'to'> {
  const safeName = escapeHtml(name);
  const safeRole = escapeHtml(role.toLowerCase());
  return {
    subject: `You've been invited to ${APP_NAME}`,
    html: layout({
      heading: `Welcome to ${APP_NAME}`,
      body: `Hi ${safeName}, an administrator has created a ${safeRole} account for you. Set your password to activate your account and sign in.`,
      ctaLabel: 'Set your password',
      ctaUrl: url,
      footnote: 'For your security this link expires in 1 hour and can only be used once. If it has expired, ask your administrator to resend the invitation.',
    }),
    text: `Hi ${name},\n\nAn administrator created a ${role.toLowerCase()} account for you on ${APP_NAME}. Set your password:\n${url}\n\nThis link expires in 1 hour. Ask your administrator to resend it if it expires.`,
  };
}
