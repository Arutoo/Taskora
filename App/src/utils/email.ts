import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM ?? 'Taskora <noreply@taskora.dev>';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendNotificationEmail(email: string, message: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.info(`[email skipped] Notification for ${email}: ${message}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Taskora Notification',
    html: `
      <p>${message}</p>
      <p style="color:#6B7280;font-size:12px;">Log in to Taskora to view details.</p>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  const resend = getResendClient();
  if (!resend) {
    console.info(`[email skipped] Verification link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Taskora account',
    html: `
      <h2>Welcome to Taskora!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
