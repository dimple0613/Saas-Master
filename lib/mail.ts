import nodemailer, { type Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let cachedTransport: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return cachedTransport;
}

export function getMailFrom(): string {
  return process.env.MAIL_FROM || "Acme Inc <no-reply@example.com>";
}

export function getAppBaseUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!isMailConfigured()) {
    console.log(
      `[mail] Dev mode: SMTP not configured, email NOT sent.\n` +
        `  to: ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  html: ${message.html.replace(/\s+/g, " ").slice(0, 500)}...`
    );
    return;
  }

  const transport = getTransport();
  await transport.sendMail({
    from: getMailFrom(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text || message.html.replace(/<[^>]+>/g, ""),
  });
}
