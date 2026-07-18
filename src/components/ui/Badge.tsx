import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn/ui-style cva Badge, re-themed to BRAND.md's semantic tones.
// BRAND.md §3.4 rule 1: color is never the only signal — icon + label always accompany tone.
const badgeVariants = cva(
  'inline-flex items-center gap-2 rounded-pill px-4 py-2 text-label uppercase tracking-wide w-fit whitespace-nowrap shrink-0',
  {
    variants: {
      tone: {
        brand: 'bg-brand/10 text-brand',
        positive: 'bg-positive/10 text-positive',
        attention: 'bg-attention/10 text-attention',
        danger: 'bg-danger/10 text-danger',
        neutral: 'bg-surface-sunken text-text-secondary',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean
  icon?: React.ReactNode
}

function Badge({
  tone,
  icon,
  className,
  children,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span'
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    >
      {icon}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
