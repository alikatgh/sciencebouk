/**
 * Encode/decode a set of slider values to a compact, URL-safe string so an exact
 * equation configuration can be deep-linked and shared (e.g. ?v=m~10,v~25).
 * Round-trips cleanly and ignores malformed fragments rather than throwing.
 */
export function encodeVarsToParam(vars: Record<string, number>): string {
  return Object.entries(vars)
    .filter(([, value]) => Number.isFinite(value))
    .map(([name, value]) => `${encodeURIComponent(name)}~${Number(value.toFixed(4))}`)
    .join(",")
}

export function decodeVarsFromParam(param: string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  if (!param) return out
  for (const pair of param.split(",")) {
    const sep = pair.indexOf("~")
    if (sep <= 0) continue
    const name = decodeURIComponent(pair.slice(0, sep))
    const value = Number(pair.slice(sep + 1))
    if (name && Number.isFinite(value)) out[name] = value
  }
  return out
}
