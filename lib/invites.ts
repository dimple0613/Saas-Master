import crypto from "crypto";

/** Default lifetime for invitation links, configurable via INVITE_EXPIRES_HOURS. */
export function getInviteExpiryHours(): number {
  const hours = parseInt(process.env.INVITE_EXPIRES_HOURS || "24", 10);
  if (Number.isNaN(hours) || hours <= 0) return 24;
  return hours;
}

/** Expiry timestamp for a new invitation link. */
export function getInviteExpiry(): Date {
  return new Date(Date.now() + getInviteExpiryHours() * 60 * 60 * 1000);
}

/** Generate a unique, cryptographically secure invitation token. */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
