/**
 * Internal authorization rule only — this account is never shown with a
 * distinct role or badge. It always displays in the interface simply as
 * "Owner", like any other Owner. Internally it holds the platform's highest
 * administrative authority and is fully protected: no one (including this
 * account itself) can change its role or status, or remove it.
 *
 * This must always be checked against the server-verified session identity
 * (e.g. the email on the `admin_profiles` row resolved from `auth.getUser()`),
 * never against a client-supplied value.
 */
const PRIMARY_OWNER_EMAIL = "vladmirbtc@gmail.com"

export function isPrimaryOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === PRIMARY_OWNER_EMAIL
}
