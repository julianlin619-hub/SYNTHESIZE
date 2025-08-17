import * as React from "react"

import { cn } from "@/lib/utils"

export interface NeonInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const NeonInput = React.forwardRef<HTMLInputElement, NeonInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border-2 border-primary bg-input px-4 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-neon-cyan focus-visible:shadow-neon-blue transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
NeonInput.displayName = "NeonInput"

export { NeonInput }