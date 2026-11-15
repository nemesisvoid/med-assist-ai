/**
 * Transactional email delivery.
 *
 * - When `RESEND_API_KEY` and `EMAIL_FROM` are set, emails are delivered through
 *   the Resend REST API (no SDK dependency required).
 * - In development without a provider, the email (including any action link) is
 *   printed to the server console so auth flows can be tested end-to-end.
 * - In production without a provider, sending fails loudly instead of silently
 *   dropping verification / password-reset emails.
 * - `EMAIL_TRANSPORT=console` forces console output in any environment (local
 *   production builds, demos). Never use it on a real deployment.
 */

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const APP_NAME = 'MedAssist AI';

export async function sendEmail({ to, subject, html, text }: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const forceConsole = process.env.EMAIL_TRANSPORT === 'console';

  if (forceConsole || !apiKey || !from) {
    if (!forceConsole && process.env.NODE_ENV === 'production') {
      throw new Error('Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM (or EMAIL_TRANSPORT=console for local demos).');
    }
    console.info(`\n[email:console] To: ${to}\n[email:console] Subject: ${subject}\n${text}\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send email (${res.status}): ${body}`);
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
      footnote: 'This invitation link expires in 72 hours. Contact your administrator if it has expired.',
    }),
    text: `Hi ${name},\n\nAn administrator created a ${role.toLowerCase()} account for you on ${APP_NAME}. Set your password:\n${url}\n\nThis link expires in 72 hours.`,
  };
}
