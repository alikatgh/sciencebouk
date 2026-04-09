import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-slate-950/58 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-200", className)}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right" }
>(({ side = "left", className, children, style, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(
        "fixed inset-y-0 z-50 flex flex-col gap-0 overflow-hidden overscroll-contain border-r border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] transition will-change-transform data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in dark:border-slate-800 dark:bg-slate-900",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        side === "left" && "left-0 w-[min(92vw,23rem)] max-w-none rounded-r-[32px] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:w-[320px] sm:rounded-r-3xl",
        side === "right" && "right-0 w-[min(92vw,23rem)] max-w-none rounded-l-[32px] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[320px] sm:rounded-l-3xl",
        className,
      )}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        ...style,
      }}
      {...props}
    >
      <SheetClose
        aria-label="Close menu"
        className="absolute right-3 top-3 z-10 rounded-full border border-slate-200/80 bg-white/90 p-2 text-slate-500 opacity-90 shadow-sm ring-offset-white transition active:scale-[0.96] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:ring-offset-slate-900"
      >
        <X className="h-4 w-4" />
      </SheetClose>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between px-5 pb-3 pt-4 sm:pt-5", className)} {...props} />
)

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-xl font-bold text-slate-900 dark:text-white", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle }
