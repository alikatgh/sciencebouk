import * as React from "react"
import { cn } from "../../lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  trackColor?: string
}

function toNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }

  return fallback
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      trackColor = "#3b82f6",
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const minValue = toNumber(min, 0)
    const maxValue = toNumber(max, minValue + 100)
    const resolvedValue = value?.[0] ?? defaultValue?.[0] ?? minValue
    const clampedValue = Math.min(Math.max(resolvedValue, minValue), maxValue)
    const progress = maxValue === minValue ? 0 : ((clampedValue - minValue) / (maxValue - minValue)) * 100

    return (
      <div className={cn("relative flex w-full items-center", className)}>
        <input
          {...props}
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={clampedValue}
          onChange={(event) => {
            onValueChange?.([Number(event.currentTarget.value)])
          }}
          className={cn(
            "science-slider block w-full cursor-grab rounded-full",
            disabled && "cursor-not-allowed opacity-50",
          )}
          style={{
            ...style,
            ["--slider-color" as string]: trackColor,
            color: trackColor,
            background: `linear-gradient(90deg, ${trackColor} 0%, ${trackColor} ${progress}%, var(--slider-unfilled, rgb(226 232 240)) ${progress}%, var(--slider-unfilled, rgb(226 232 240)) 100%)`,
          }}
        />
      </div>
    )
  },
)

Slider.displayName = "Slider"
