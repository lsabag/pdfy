interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export async function sendEmail(apiKey: string, options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, from = "noreply@pdfy.nextli.co.il", fromName = "pdfy" } = options;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  return res.ok;
}

function buildEmailHtml(heading: string, body: string, buttonText?: string, buttonUrl?: string, footer?: string): string {
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1473E6;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;">${heading}</h1>
    </div>
    <div style="padding:32px;text-align:center;">
      <p style="color:#2C2C2C;font-size:15px;line-height:1.7;">${body}</p>
      ${buttonText && buttonUrl ? `<a href="${buttonUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1473E6;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${buttonText}</a>` : ""}
      ${footer ? `<p style="color:#909090;font-size:12px;margin-top:24px;">${footer}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export function buildWelcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Welcome to pdfy!",
    html: buildEmailHtml(
      "Welcome to pdfy!",
      `Hi ${userName}, your PDF workspace is ready. Upload, edit, sign, and share documents from anywhere.`,
      "Open pdfy",
      "https://pdfy.nextli.co.il/dashboard",
      "You're receiving this because you created a pdfy account."
    ),
  };
}

export function buildResetPasswordEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your password - pdfy",
    html: buildEmailHtml(
      "Reset Password",
      "Click the button below to reset your password. This link is valid for 60 minutes.",
      "Reset Password",
      resetUrl,
      "If you didn't request this, you can safely ignore this email."
    ),
  };
}

export function buildShareNotificationEmail(sharedBy: string, docName: string, shareUrl: string): { subject: string; html: string } {
  return {
    subject: `${sharedBy} shared "${docName}" with you`,
    html: buildEmailHtml(
      "Document Shared",
      `${sharedBy} shared the document "${docName}" with you on pdfy.`,
      "View Document",
      shareUrl,
    ),
  };
}

export function buildInviteEmail(invitedBy: string, inviteUrl: string): { subject: string; html: string } {
  return {
    subject: `${invitedBy} invited you to pdfy`,
    html: buildEmailHtml(
      "You're Invited!",
      `${invitedBy} invited you to join pdfy - a PDF workspace for editing, signing, and sharing documents.`,
      "Accept Invitation",
      inviteUrl,
    ),
  };
}
