'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import * as Dialog from '@ui-sdk/react/dialog'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

const Sheet = Dialog.Dialog
function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children))
    return <Dialog.DialogTrigger render={children} {...props} />
  return <Dialog.DialogTrigger {...props}>{children}</Dialog.DialogTrigger>
}
function SheetClose({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.DialogClose>, 'children'> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  if (asChild && React.isValidElement(children))
    return <Dialog.DialogClose render={children} {...props} />
  return <Dialog.DialogClose {...props}>{children}</Dialog.DialogClose>
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: Omit<
  React.ComponentProps<typeof Dialog.DialogContent>,
  'className' | 'children'
> & { className?: string; children?: React.ReactNode } & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  const t = useTranslations('common')

  return (
    <>
      <Dialog.DialogBackdrop className="fixed inset-0 bg-black/50" />
      <Dialog.DialogContent
        container={typeof document === 'undefined' ? undefined : document.body}
        className={cn(
          'bg-background data-ending-style:animate-out data-open:animate-in fixed inset-auto z-50 m-0 flex max-h-none max-w-none flex-col gap-4 shadow-lg transition ease-in-out data-ending-style:duration-300 data-open:duration-500',
          side === 'right' &&
            'data-ending-style:slide-out-to-right data-open:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-ending-style:slide-out-to-left data-open:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-ending-style:slide-out-to-top data-open:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-ending-style:slide-out-to-bottom data-open:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Dialog.DialogClose className="ring-offset-background focus:ring-ring data-open:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">{t('close')}</span>
          </Dialog.DialogClose>
        )}
      </Dialog.DialogContent>
    </>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.DialogTitle>, 'className'> & {
  className?: string
}) {
  return (
    <Dialog.DialogTitle
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.DialogDescription>, 'className'> & {
  className?: string
}) {
  return (
    <Dialog.DialogDescription
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
