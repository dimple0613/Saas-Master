import { getAppBaseUrl } from "@/lib/mail";

export interface TemplateUser {
  name: string;
  email?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function brandName(): string {
  return escapeHtml(process.env.APP_NAME || "Acme Inc");
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${brandName()}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-size:18px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">${brandName()}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;border-top:1px solid #f4f4f5;margin-top:16px;">
                <p style="font-size:12px;line-height:1.5;color:#a1a1aa;margin:16px 0 0 0;">
                  You received this email because of an account or activity on ${brandName()}.
                  If you didn&apos;t expect this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function forgotPasswordTemplate(user: TemplateUser, token: string): string {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const body = `
<p style="margin:0 0 12px 0;">Hi ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px 0;">We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.</p>
${button(resetUrl, "Reset password")}
<p style="margin:0 0 12px 0;">Or copy and paste this link into your browser:</p>
<p style="margin:0 0 12px 0;word-break:break-all;font-size:13px;color:#52525b;">${escapeHtml(resetUrl)}</p>
<p style="margin:0;">If you didn&apos;t request this, you can safely ignore this email and your password will stay the same.</p>`;
  return layout(body);
}

export function inviteMemberTemplate(
  user: TemplateUser,
  data: { inviterName: string; orgName: string; role: string; token: string }
): string {
  const acceptUrl = `${getAppBaseUrl()}/invite?token=${encodeURIComponent(data.token)}`;
  const body = `
<p style="margin:0 0 12px 0;">Hi ${escapeHtml(user.name || user.email || "there")},</p>
<p style="margin:0 0 12px 0;"><strong>${escapeHtml(data.inviterName)}</strong> has invited you to join <strong>${escapeHtml(data.orgName)}</strong> as <strong>${escapeHtml(data.role)}</strong>.</p>
${button(acceptUrl, "Accept invitation")}
<p style="margin:0 0 12px 0;">This invitation expires in <strong>24 hours</strong>.</p>
<p style="margin:0 0 12px 0;">Or copy and paste this link into your browser:</p>
<p style="margin:0;word-break:break-all;font-size:13px;color:#52525b;">${escapeHtml(acceptUrl)}</p>`;
  return layout(body);
}

export function welcomeTemplate(user: TemplateUser, orgName: string): string {
  const loginUrl = `${getAppBaseUrl()}/login`;
  const body = `
<p style="margin:0 0 12px 0;">Hi ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px 0;">Welcome to ${brandName()}. Your account has been created${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ""}.</p>
${button(loginUrl, "Sign in to your account")}
<p style="margin:0 0 12px 0;">Need help getting started? Just reply to this email and our team will be happy to assist.</p>`;
  return layout(body);
}

export function passwordChangedTemplate(user: TemplateUser): string {
  const loginUrl = `${getAppBaseUrl()}/login`;
  const body = `
<p style="margin:0 0 12px 0;">Hi ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px 0;">Your password has been changed successfully. You can now sign in with your new password.</p>
${button(loginUrl, "Sign in")}
<p style="margin:0 0 12px 0;">If you didn&apos;t make this change, please <a href="${escapeHtml(loginUrl)}" style="color:#18181b;">contact support</a> immediately.</p>`;
  return layout(body);
}
