"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("mx-2 h-full w-px bg-border", className)}
        {...props}
      />
    )
  }
  return <div role="separator" className={cn("my-4 h-px w-full bg-border", className)} {...props} />
}

export default Separator
