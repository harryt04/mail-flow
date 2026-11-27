'use client'

import type { ComponentProps } from 'react'
import { Textarea as SdkTextarea } from '@ui-sdk/react/textarea'
import { cn } from '@/lib/utils'

function Textarea({
  className,
  ...props
}: Omit<ComponentProps<typeof SdkTextarea>, 'className'> & {
  className?: string
}) {
  return (
    <SdkTextarea
      data-ui="textarea"
      className={cn(
        'rounded-card border-border bg-surface-sunken text-body text-text-primary w-full border p-4',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
