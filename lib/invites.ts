import { randomBytes, createHash } from "crypto"

/**
 * Generates a cryptographically secure invite token.
 * Returns the raw token (goes in the link, never stored) and its SHA-256 hash (stored in the DB).
 */
export function generateInviteToken() {
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = hashInviteToken(rawToken)
  return { rawToken, tokenHash }
}

export function hashInviteToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex")
}

export function isInviteExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}
