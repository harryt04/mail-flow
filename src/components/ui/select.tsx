'use client'

import type { ComponentProps, ReactNode } from 'react'
import * as Sdk from '@ui-sdk/react/select'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = Sdk.Select
const SelectLabel = Sdk.SelectLabel
const SelectValue = Sdk.SelectValue

function SelectTrigger({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Sdk.SelectTrigger>, 'className' | 'children'> & {
  className?: string
  children?: ReactNode
}) {
  return (
    <Sdk.SelectTrigger
      data-ui="select-trigger"
      className={cn(
        'rounded-card border-border bg-surface-sunken text-body text-text-primary flex w-full items-center justify-between gap-2 border p-3 text-start disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
    </Sdk.SelectTrigger>
  )
}

function SelectContent({
  className,
  sideOffset = 4,
  ...props
}: Omit<ComponentProps<typeof Sdk.SelectContent>, 'className' | 'container'> & {
  className?: string
}) {
  return (
    <Sdk.SelectContent
      data-ui="select-content"
      container={typeof document === 'undefined' ? undefined : document.body}
      sideOffset={sideOffset}
      className={cn(
        'rounded-card border-border bg-surface text-body text-text-primary z-50 max-h-[min(20rem,var(--available-height))] w-(--anchor-width) overflow-y-auto border p-1 shadow-md',
        className,
      )}
      {...props}
    />
  )
}

function SelectItem<T>({
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Sdk.SelectItem<T>>, 'className' | 'children'> & {
  className?: string
  children?: ReactNode
}) {
  return (
    <Sdk.SelectItem
      data-ui="select-item"
      className={cn(
        'data-highlighted:bg-surface-sunken flex cursor-default items-center justify-between gap-2 rounded-md px-3 py-2 outline-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Sdk.SelectItemText>{children}</Sdk.SelectItemText>
      <Sdk.SelectItemIndicator>
        <CheckIcon aria-hidden="true" className="size-4" />
      </Sdk.SelectItemIndicator>
    </Sdk.SelectItem>
  )
}

export {
  Select,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
