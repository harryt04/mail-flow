'use client'

import * as React from 'react'
import * as Sdk from '@ui-sdk/react/tooltip'
import { cn } from '@/lib/utils'

const Delay = React.createContext(0)

function TooltipProvider({
  delayDuration = 0,
  children,
}: {
  delayDuration?: number
  children: React.ReactNode
}) {
  return <Delay.Provider value={delayDuration}>{children}</Delay.Provider>
}

function Tooltip({
  delayDuration,
  ...props
}: React.ComponentProps<typeof Sdk.Tooltip> & { delayDuration?: number }) {
  const delay = React.useContext(Delay)
  return <Sdk.Tooltip delay={delayDuration ?? delay} {...props} />
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children))
    return <Sdk.TooltipTrigger render={children} {...props} />
  return <Sdk.TooltipTrigger {...props}>{children}</Sdk.TooltipTrigger>
}

function TooltipContent({
  className,
  children,
  sideOffset = 0,
  hidden,
  ...props
}: Omit<
  React.ComponentProps<typeof Sdk.TooltipContent>,
  'className' | 'children'
> & { className?: string; children?: React.ReactNode }) {
  if (hidden) return null
  return (
    <Sdk.TooltipContent
      container={typeof document === 'undefined' ? undefined : document.body}
      sideOffset={sideOffset}
      className={cn(
        'bg-foreground text-background z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance',
        className,
      )}
      {...props}
    >
      {children}
      <Sdk.TooltipArrow className="bg-foreground size-2.5 rotate-45 rounded-[2px]" />
    </Sdk.TooltipContent>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
