'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || "")
  const currentTab = value !== undefined ? value : activeTab
  const changeTab = onValueChange || setActiveTab

  return (
    <TabsContext.Provider value={{ value: currentTab, onValueChange: changeTab }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  value,
  className,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  value: string
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used inside Tabs")

  const isActive = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground hover:bg-secondary/40 aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  value: string
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used inside Tabs")

  const isActive = context.value === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-2 focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
