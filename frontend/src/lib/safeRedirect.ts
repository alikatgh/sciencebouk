/**
 * safeRedirect — validates an external URL before navigating to it.
 *
 * Prevents open-redirect and javascript: URI attacks when the redirect URL
 * originates from an API response. Only allows HTTPS URLs whose hostname
 * exactly matches (or is a subdomain of) an entry in the allowlist.
 */

const ALLOWED_DOMAINS = ["checkout.stripe.com", "billing.stripe.com"]

export function safeRedirect(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return
    const allowed = ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
    )
    if (!allowed) return
    window.location.href = url
  } catch {
    // Invalid URL — do nothing
  }
}
