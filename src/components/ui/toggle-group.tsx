'use client'

import type { ComponentProps } from 'react'
import * as Sdk from '@ui-sdk/react/toggle'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

function ToggleGroup<T extends string>({
  className,
  ...props
}: Omit<ComponentProps<typeof Sdk.ToggleGroup<T>>, 'className'> & {
  className?: string
}) {
  return (
    <Sdk.ToggleGroup
      data-ui="toggle-group"
      className={cn('flex flex-col gap-2 sm:flex-wrap', className)}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: Omit<ComponentProps<typeof Sdk.Toggle>, 'className'> & {
  className?: string
}) {
  return (
    <Sdk.Toggle
      data-ui="toggle-group-item"
      focusableWhenDisabled
      className={cn(
        buttonVariants({ variant: 'secondary', size: 'sm' }),
        'data-pressed:bg-brand data-pressed:text-on-accent data-pressed:hover:bg-brand-strong w-full data-disabled:opacity-50 data-pressed:border-0 sm:w-auto',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
