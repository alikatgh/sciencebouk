import { area as d3Area, line as d3Line, scaleLinear } from "d3"
import type { ScaleLinear } from "d3"
import { useCallback, useMemo, useRef } from "react"
import type { RefObject } from "react"
import { useContainerSize } from "../../hooks/useContainerSize"

export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

interface UseChartFrameOptions {
  margin: ChartMargin
  minHeight?: number
  xDomain: [number, number]
  yDomain: [number, number]
  y2Domain?: [number, number]
}

export interface ChartFrame {
  containerRef: RefObject<HTMLDivElement | null>
  width: number
  height: number
  plotLeft: number
  plotRight: number
  plotTop: number
  plotBottom: number
  plotWidth: number
  plotHeight: number
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  y2Scale: ScaleLinear<number, number> | null
  clientXToX: (clientX: number) => number | null
  clientYToY: (clientY: number, axis?: "left" | "right") => number | null
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function useChartFrame({
  margin,
  minHeight = 300,
  xDomain,
  yDomain,
  y2Domain,
}: UseChartFrameOptions): ChartFrame {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useContainerSize(containerRef)

  const width = Math.max(size.width, margin.left + margin.right + 120)
  const height = Math.max(size.height, minHeight)
  const plotLeft = margin.left
  const plotRight = width - margin.right
  const plotTop = margin.top
  const plotBottom = height - margin.bottom
  const plotWidth = Math.max(plotRight - plotLeft, 10)
  const plotHeight = Math.max(plotBottom - plotTop, 10)

  const xScale = useMemo(
    () => scaleLinear().domain(xDomain).range([plotLeft, plotRight]),
    [plotLeft, plotRight, xDomain],
  )
  const yScale = useMemo(
    () => scaleLinear().domain(yDomain).range([plotBottom, plotTop]),
    [plotBottom, plotTop, yDomain],
  )
  const y2Scale = useMemo(
    () => (y2Domain ? scaleLinear().domain(y2Domain).range([plotBottom, plotTop]) : null),
    [plotBottom, plotTop, y2Domain],
  )

  const clientXToX = useCallback((clientX: number): number | null => {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left - plotLeft) / plotWidth, 0, 1)
    return xDomain[0] + ratio * (xDomain[1] - xDomain[0])
  }, [plotLeft, plotWidth, xDomain])

  const clientYToY = useCallback((clientY: number, axis: "left" | "right" = "left"): number | null => {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientY - rect.top - plotTop) / plotHeight, 0, 1)
    const domain = axis === "right" && y2Domain ? y2Domain : yDomain
    return domain[1] + ratio * (domain[0] - domain[1])
  }, [plotHeight, plotTop, y2Domain, yDomain])

  return {
    containerRef,
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    plotWidth,
    plotHeight,
    xScale,
    yScale,
    y2Scale,
    clientXToX,
    clientYToY,
  }
}

export function getTicks(domain: [number, number], count: number): number[] {
  return scaleLinear().domain(domain).ticks(count)
}

interface LinePathOptions<T> {
  data: T[]
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  x: (datum: T) => number
  y: (datum: T) => number | null | undefined
}

export function buildLinePath<T>({
  data,
  xScale,
  yScale,
  x,
  y,
}: LinePathOptions<T>): string {
  return (
    d3Line<T>()
      .defined((datum) => {
        const nextY = y(datum)
        return nextY != null && Number.isFinite(nextY)
      })
      .x((datum) => xScale(x(datum)))
      .y((datum) => yScale(y(datum) ?? 0))(data) ?? ""
  )
}

interface AreaPathOptions<T> {
  data: T[]
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  x: (datum: T) => number
  y0: (datum: T) => number
  y1: (datum: T) => number | null | undefined
}

export function buildAreaPath<T>({
  data,
  xScale,
  yScale,
  x,
  y0,
  y1,
}: AreaPathOptions<T>): string {
  return (
    d3Area<T>()
      .defined((datum) => {
        const nextY = y1(datum)
        return nextY != null && Number.isFinite(nextY)
      })
      .x((datum) => xScale(x(datum)))
      .y0((datum) => yScale(y0(datum)))
      .y1((datum) => yScale(y1(datum) ?? 0))(data) ?? ""
  )
}
