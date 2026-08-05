import crypto from "crypto";

/** SHA-256 hex digest — used for invite tokens and session ids. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
