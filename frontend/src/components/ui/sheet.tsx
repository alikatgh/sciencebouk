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
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right" }
>(({ side = "left", className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 z-50 flex flex-col gap-0 border-r border-slate-200 bg-white shadow-2xl transition duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        side === "left" && "left-0 w-[220px] max-w-[260px] rounded-r-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        side === "right" && "right-0 w-[220px] max-w-[260px] rounded-l-2xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between px-5 pb-3 pt-5", className)} {...props} />
)

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-xl font-bold text-slate-900 dark:text-white", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle }
