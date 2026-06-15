import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // h-11 (44px touch target) on phones; md:h-9 keeps the compact desktop
        // height byte-identical so golden screenshots/demo are unaffected.
        "h-11 w-full min-w-0 rounded-none border-0 border-b-2 border-input bg-transparent px-0 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:h-9 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
