import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, ...props }, ref) => {
  const numericMax = typeof max === "number" ? max : Number(max) || 100
  const numericValue = typeof value === "number"
    ? Math.min(Math.max(value, 0), numericMax)
    : 0

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={numericValue}
      max={numericMax}
      aria-valuemin={props["aria-valuemin"] ?? 0}
      aria-valuemax={props["aria-valuemax"] ?? numericMax}
      aria-valuenow={props["aria-valuenow"] ?? Math.round(numericValue)}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
        style={{ width: `${numericValue}%` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
