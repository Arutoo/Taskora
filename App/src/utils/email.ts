import * as Brevo from '@getbrevo/brevo';

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@taskora.dev';
const FROM_NAME  = process.env.EMAIL_FROM_NAME    ?? 'Taskora';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

function getBrevoClient(): Brevo.TransactionalEmailsApi | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;
  const client = new Brevo.TransactionalEmailsApi();
  client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return client;
}

export async function sendNotificationEmail(email: string, message: string): Promise<void> {
  const client = getBrevoClient();
  if (!client) {
    console.info(`[email skipped] Notification for ${email}: ${message}`);
    return;
  }

  await client.sendTransacEmail({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email }],
    subject: 'Taskora Notification',
    htmlContent: `
      <p>${message}</p>
      <p style="color:#6B7280;font-size:12px;">Log in to Taskora to view details.</p>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  const client = getBrevoClient();
  if (!client) {
    console.info(`[email skipped] Verification link for ${email}: ${link}`);
    return;
  }

  await client.sendTransacEmail({
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email }],
    subject: '✅ Verify your Taskora account',
    htmlContent: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#4F46E5;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Taskora</h1>
          <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">Team Project Management</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#111827;margin:0 0 8px;font-size:20px;font-weight:600;">Verify your email address</h2>
          <p style="color:#6b7280;margin:0 0 28px;font-size:15px;line-height:1.6;">
            Thanks for signing up! Click the button below to verify your email and activate your account.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${link}" style="display:inline-block;padding:14px 32px;background:#4F46E5;color:#ffffff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.2px;">
              Verify Email Address
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">Or copy this link into your browser:</p>
          <p style="background:#f3f4f6;border-radius:6px;padding:10px 14px;font-size:12px;color:#6b7280;word-break:break-all;margin:0 0 28px;">
            ${link}
          </p>
          <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
            <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
              ⏰ This link expires in <strong>24 hours</strong>.<br/>
              If you didn't create a Taskora account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}
