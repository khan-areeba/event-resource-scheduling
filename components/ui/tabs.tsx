"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type TabsContextType = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextType | null>(null)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
}

export function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) {
  const controlled = value !== undefined
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "")

  const current = controlled ? (value as string) : internal
  const setValue = (v: string) => {
    if (!controlled) setInternal(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  const selected = ctx?.value === value
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "select-none rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        selected ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  if (ctx?.value !== value) return null
  return <div role="tabpanel" className={cn("mt-3", className)} {...props} />
}

export default Tabs
