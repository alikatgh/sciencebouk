/**
 * Shared layout utilities for D3 scenes.
 * Every scene should use these instead of hardcoding pixel positions.
 */

export interface SceneLayout {
  /** Container width */
  W: number
  /** Container height */
  H: number
  /** Left margin */
  ml: number
  /** Right margin */
  mr: number
  /** Top margin */
  mt: number
  /** Bottom margin */
  mb: number
  /** Usable plot width */
  pw: number
  /** Usable plot height */
  ph: number
  /** Plot left edge */
  pl: number
  /** Plot right edge */
  pr: number
  /** Plot top edge */
  pt: number
  /** Plot bottom edge */
  pb: number
  /** Center X */
  cx: number
  /** Center Y */
  cy: number
  /** Adaptive font size — scales with container */
  fontSize: (base: number) => number
  /** Adaptive spacing */
  spacing: (base: number) => number
}

/**
 * Compute a responsive layout from container dimensions.
 * All positions are derived from W and H — zero hardcoded pixels.
 */
export function computeLayout(W: number, H: number, margins?: { top?: number; right?: number; bottom?: number; left?: number }): SceneLayout {
  const scale = Math.min(W, H) / 440 // 440 was old default height

  const mt = (margins?.top ?? 0.08) * H
  const mb = (margins?.bottom ?? 0.08) * H
  const ml = (margins?.left ?? 0.06) * W
  const mr = (margins?.right ?? 0.06) * W

  const pw = W - ml - mr
  const ph = H - mt - mb

  return {
    W, H,
    ml, mr, mt, mb,
    pw, ph,
    pl: ml,
    pr: W - mr,
    pt: mt,
    pb: H - mb,
    cx: W / 2,
    cy: H / 2,
    fontSize: (base: number) => Math.max(10, Math.round(base * scale)),
    spacing: (base: number) => Math.max(4, Math.round(base * scale)),
  }
}

/**
 * Split the plot area into N horizontal rows with gaps.
 * Returns center Y positions for each row.
 */
export function splitRows(layout: SceneLayout, count: number, gap = 0.02): number[] {
  const gapPx = gap * layout.H
  const totalGap = gapPx * (count - 1)
  const rowH = (layout.ph - totalGap) / count
  return Array.from({ length: count }, (_, i) => layout.pt + rowH / 2 + i * (rowH + gapPx))
}

/**
 * Split the plot area into N vertical columns with gaps.
 * Returns center X positions and widths for each column.
 */
export function splitCols(layout: SceneLayout, widths: number[]): Array<{ x: number; w: number }> {
  const total = widths.reduce((a, b) => a + b, 0)
  let x = layout.pl
  return widths.map((w) => {
    const colW = (w / total) * layout.pw
    const result = { x: x + colW / 2, w: colW }
    x += colW
    return result
  })
}
