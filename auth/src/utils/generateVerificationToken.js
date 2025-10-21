import crypto from "crypto";

export function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const tokenExpiry = new Date(Date.now() + 1000 * 60 * 15);
  return { token, hashedToken, tokenExpiry };
}
