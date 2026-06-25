/**
 * Encode/decode a set of slider values to a compact, URL-safe string so an exact
 * equation configuration can be deep-linked and shared (e.g. ?v=m~10,v~25).
 * Round-trips cleanly and ignores malformed fragments rather than throwing.
 *
 * Decoding treats the param as fully untrusted (it comes straight from the URL):
 * it rejects prototype-pollution keys, caps the number of pairs, and only keeps
 * finite numbers — so a hostile link can never poison an object or wedge the app.
 */

// Guard against prototype-pollution via attacker-chosen keys.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"])
// A shared equation has a handful of sliders; cap well above that to bound work.
const MAX_PAIRS = 64

export function encodeVarsToParam(vars: Record<string, number>): string {
  return Object.entries(vars)
    .filter(([, value]) => Number.isFinite(value))
    .map(([name, value]) => `${encodeURIComponent(name)}~${Number(value.toFixed(4))}`)
    .join(",")
}

export function decodeVarsFromParam(param: string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!param) return out

  const pairs = param.split(",", MAX_PAIRS)
  for (const pair of pairs) {
    const sep = pair.indexOf("~")
    if (sep <= 0) continue

    let name: string
    try {
      name = decodeURIComponent(pair.slice(0, sep))
    } catch {
      continue // malformed percent-encoding — skip rather than throw
    }
    if (!name || FORBIDDEN_KEYS.has(name)) continue

    const raw = pair.slice(sep + 1).trim()
    if (raw === "") continue // `name~` with no value is not a real "0"
    const value = Number(raw)
    if (Number.isFinite(value)) out[name] = value
  }
  return out
}
