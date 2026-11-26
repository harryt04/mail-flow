'use client'

import { Button as SdkButton } from '@ui-sdk/react/button'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn/ui-style cva button, re-themed to BRAND.md's token system instead of
// the shadcn default palette. Variant/size names match this app's existing
// call sites (Home/Listen/Settings/Landing) so no callers needed to change.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill transition-colors duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-accent hover:bg-brand-strong',
        secondary:
          'bg-surface text-text-primary border border-border hover:bg-surface-sunken',
        danger: 'bg-danger text-on-accent hover:opacity-90',
        ghost: 'bg-transparent text-brand hover:bg-surface-sunken',
        google:
          'bg-surface text-text-primary border border-border shadow-[var(--shadow-soft)] hover:bg-surface-sunken hover:border-text-muted font-medium',
      },
      size: {
        // BRAND.md §5: 56px min for primary voice-command fallback buttons, 44px elsewhere.
        md: 'min-h-11 px-6 text-body',
        sm: 'min-h-11 px-4 text-body',
        lg: 'min-h-14 px-8 text-body-lg font-semibold',
        // 44px square, icon-only (e.g. the sidebar's mobile menu trigger) — meets
        // BRAND.md §5's 44px minimum touch target for non-primary controls.
        icon: 'size-11 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
  icon?: React.ReactNode
}

function Button({
  variant,
  size,
  fullWidth,
  asChild = false,
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const child = asChild ? React.Children.only(children) : null
  const element = React.isValidElement<{ children?: React.ReactNode }>(child)
    ? child
    : undefined
  return (
    <SdkButton
      render={element}
      type={element ? undefined : (props.type ?? 'submit')}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    >
      {icon}
      {element ? element.props.children : children}
    </SdkButton>
  )
}

export { Button, buttonVariants }
